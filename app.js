/* ---------- Dados simulados (no projeto real virão da API Spring Boot) ---------- */
const CATS = ['Festivais','Museus','Gastronomia'];
const COR = {Festivais:'#2340D8', Museus:'#0F766E', Gastronomia:'#D9480F'};
let pois = [
  {id:1,nome:'Praça do Relógio',cat:'Festivais',x:18,y:26},
  {id:2,nome:'Museu da Memória',cat:'Museus',x:38,y:16},
  {id:3,nome:'Mercado Central',cat:'Gastronomia',x:46,y:44},
  {id:4,nome:'Parque das Águas',cat:'Festivais',x:76,y:22},
  {id:5,nome:'Galeria Estação',cat:'Museus',x:22,y:62},
  {id:6,nome:'Casa do Café',cat:'Gastronomia',x:64,y:64},
  {id:7,nome:'Anfiteatro do Lago',cat:'Festivais',x:86,y:48},
  {id:8,nome:'Museu do Trem',cat:'Museus',x:44,y:84}
];
let eventos = [
  {id:1,titulo:'Festival de Sopas do Cerrado',cat:'Gastronomia',poi:3,lot:86,ini:'11:00',fim:'22:00',
   tl:[['11:00','Abertura das barracas'],['14:00','Aula de caldos com o chef Ari'],['18:30','Degustação guiada'],['21:00','Encerramento musical']]},
  {id:2,titulo:'Noite dos Museus',cat:'Museus',poi:2,lot:42,ini:'18:00',fim:'23:00',
   tl:[['18:00','Entrada gratuita'],['19:30','Visita guiada à coleção'],['21:00','Concerto de câmara']]},
  {id:3,titulo:'Show no Anfiteatro',cat:'Festivais',poi:7,lot:93,ini:'19:00',fim:'23:30',
   tl:[['19:00','Abertura dos portões'],['20:30','Banda convidada'],['22:00','Atração principal']]},
  {id:4,titulo:'Oficina de Cerâmica',cat:'Museus',poi:5,lot:28,ini:'09:00',fim:'12:00',
   tl:[['09:00','Recepção e materiais'],['09:30','Modelagem em argila'],['11:15','Esmaltação']]},
  {id:5,titulo:'Feira do Café Especial',cat:'Gastronomia',poi:6,lot:61,ini:'08:00',fim:'17:00',
   tl:[['08:00','Abertura da feira'],['10:00','Cupping aberto'],['15:00','Sorteio de kits']]},
  {id:6,titulo:'Festival de Pipas',cat:'Festivais',poi:4,lot:55,ini:'10:00',fim:'18:00',
   tl:[['10:00','Montagem das pipas'],['13:00','Desfile no gramado'],['16:00','Premiação']]}
];
let arestas = [[1,2],[1,5],[2,3],[2,4],[3,4],[3,5],[3,6],[4,7],[6,7],[3,8],[5,8],[6,8]];
const M_POR_UNID = 25; // 1 unidade do plano = 25 m

/* ---------- Estado ---------- */
const S = {cat:'Todos', busca:'', mapCat:'Todos', o:null, d:null, rota:null, favs:new Set([1]), toast:''};
const ls = {
  get(k,def){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch(e){ return def } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)) }catch(e){} },
  del(k){ try{ localStorage.removeItem(k) }catch(e){} }
};
const logado = () => !!ls.get('tolizzo_token',null);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const poiById = id => pois.find(p=>p.id===+id);
const $ = s => document.querySelector(s);
const DEF = JSON.stringify({pois,eventos,arestas});
(function(){ const d=ls.get('tolizzo_dados',null); if(d){pois=d.pois;eventos=d.eventos;arestas=d.arestas}
  const f=ls.get('tolizzo_favs',null); if(f) S.favs=new Set(f) })();
const salvar = () => { ls.set('tolizzo_dados',{pois,eventos,arestas}); ls.set('tolizzo_favs',[...S.favs]) };
const mins = h => { const [a,b]=h.split(':'); return +a*60+ +b };
const aoVivo = e => { const n=new Date(), m=n.getHours()*60+n.getMinutes(), i=mins(e.ini), f=mins(e.fim); return f>i ? m>=i&&m<f : m>=i||m<f };
async function hash(s){ if(!(window.crypto&&crypto.subtle)) return btoa(unescape(encodeURIComponent(s)));
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('') }

/* ---------- Algoritmos (simulam o que o backend Java fará) ---------- */
const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
function menorCaminho(o,d){
  const D={}, prev={}, fila=new Set(pois.map(p=>p.id));
  pois.forEach(p=>D[p.id]=Infinity); D[o]=0;
  while(fila.size){
    let u=null; fila.forEach(i=>{ if(u===null||D[i]<D[u]) u=i });
    if(D[u]===Infinity) break; fila.delete(u);
    arestas.forEach(([a,b])=>{
      const v = a===u?b : b===u?a : null;
      if(v===null||!fila.has(v)) return;
      const alt = D[u]+dist(poiById(u),poiById(v));
      if(alt<D[v]){ D[v]=alt; prev[v]=u }
    });
  }
  if(D[d]===Infinity) return null;
  const caminho=[]; for(let c=d;c!==undefined;c=prev[c]) caminho.unshift(c);
  return {caminho, metros:Math.round(D[d]*M_POR_UNID)};
}
const nivel = n => n>=80 ? ['Lotado','l-cheio','b-cheio'] : n>=50 ? ['Movimentado','l-med','b-med'] : ['Tranquilo','l-ok','b-ok'];
const lotHTML = n => { const [t,c,b]=nivel(n); return `<div class="lot" role="group" aria-label="Lotação ${n}% – ${t}">
  <div class="rot"><span class="${c}">${t}</span><span>${n}% da capacidade</span></div>
  <div class="barra"><b class="${b}" style="width:${n}%"></b></div></div>` };

/* ---------- Ícones ---------- */
const ic = {
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  cfg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  pal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.4-2.2-.6-1.2.2-2.3 1.6-2.3H17a4 4 0 0 0 4-4A9 9 0 0 0 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/></svg>',
  heart:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.800-8 11-8 11z"/></svg>'
};

/* ---------- API de Mapa (Leaflet + OpenStreetMap / CARTO) · Plano Piloto, Brasília ---------- */
const LAT0=-15.780, LNG0=-47.905, DLAT=0.000225, DLNG=0.000233;
const toLL = p => [LAT0-p.y*DLAT, LNG0+p.x*DLNG];
const toXY = ll => ({x:Math.min(100,Math.max(0,Math.round((ll.lng-LNG0)/DLNG))), y:Math.min(100,Math.max(0,Math.round((LAT0-ll.lat)/DLAT)))});
const llTxt = p => toLL(p).map(v=>v.toFixed(5)).join(', ');
let MAPS=[], MAP=null, CAM=null;
const temL = () => typeof L!=='undefined';

function novoMapa(el,opts={}){
  const m=L.map(el,opts);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{
    maxZoom:19,
    attribution:'Tiles &copy; Esri'
  }).addTo(m);
  pois.length ? m.fitBounds(L.latLngBounds(pois.map(toLL)).pad(.25)) : m.setView([-15.7912,-47.8931],15);
  MAPS.push(m);
  setTimeout(()=>m.invalidateSize(),60);
  return m;
}

function marcador(p,{r=8,anel='#fff',nome=true,click=false}={}){
  const mk=L.circleMarker(toLL(p),{
    radius:r,
    color:anel,
    weight:3,
    fillColor:COR[p.cat] || '#2340D8',
    fillOpacity:1,
    interactive:click
  });
  if(click) mk.on('click',()=>clicarPoi(p.id));
  if(nome) mk.bindTooltip(esc(p.nome),{permanent:true,direction:'top',offset:[0,-r]});
  return mk;
}

function desenhaMapa(g){
  arestas.forEach(([a,b])=>{
    const A=poiById(a), B=poiById(b);
    if(A&&B) L.polyline([toLL(A),toLL(B)],{color:'#9AA7C4',weight:4,opacity:.7,interactive:false}).addTo(g);
  });
  if(S.rota && S.rota.caminho && S.rota.caminho.length){
    const pts=S.rota.caminho.map(i=>toLL(poiById(i))).filter(Boolean);
    L.polyline(pts,{color:'#14213D',weight:8,interactive:false}).addTo(g);
    L.polyline(pts,{color:'#F5B700',weight:4,dashArray:'8 8',interactive:false}).addTo(g);
    if(MAP && pts.length>1) MAP.fitBounds(L.latLngBounds(pts).pad(.25));
  }
  pois.forEach(p=>{
    if(p.id===S.o||p.id===S.d){
      L.marker(toLL(p),{
        icon:L.divIcon({
          className:'',
          html:`<div class="pin ${p.id===S.d?'d':''}">${p.id===S.o?'A':'B'}</div>`,
          iconSize:[28,28],
          iconAnchor:[14,14]
        })
      }).on('click',()=>clicarPoi(p.id)).bindTooltip(esc(p.nome),{permanent:true,direction:'top',offset:[0,-14]}).addTo(g);
    } else if(S.mapCat==='Todos'||p.cat===S.mapCat){
      marcador(p,{click:true}).addTo(g);
    }
  });
}

function miniMapa(id){
  const e=eventos.find(x=>x.id===+id), c=$('#miniMapa'); if(!e||!c||!temL()) return;
  const p=poiById(e.poi); if(!p) return;
  const m=novoMapa(c,{scrollWheelZoom:false});
  pois.forEach(q=>{ if(q.id!==p.id) marcador(q,{r:5,nome:false}).addTo(m) });
  marcador(p,{r:11,anel:'#14213D'}).addTo(m);
  m.setView(toLL(p),16);
}

function mapaGestao(){
  const c=$('#mapaGestao'); if(!c||!temL()) return;
  const m=novoMapa(c,{scrollWheelZoom:false});
  let tmp=null;
  pois.forEach(q=>marcador(q,{r:6,nome:false}).addTo(m));
  m.on('click',ev=>{
    const xy=toXY(ev.latlng);
    $('#gx').value=xy.x;
    $('#gy').value=xy.y;
    if(tmp) tmp.remove();
    tmp=L.circleMarker(toLL(xy),{radius:8,color:'#14213D',weight:3,fillColor:'#F5B700',fillOpacity:1}).addTo(m);
  });
}

/* ---------- Telas ---------- */
function telaLogin(modo='entrar'){
  const cad = modo==='cadastro';
  return `<div class="login">
    <section class="promo">
      <svg class="fundo" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g fill="none" stroke="#fff" stroke-width=".5">
          <path d="M0 40Q50 10 100 50T200 30M0 90Q60 60 110 100T200 80M0 140Q40 110 100 150T200 130M0 190Q70 160 120 190T200 180"/>
          <path d="M40 0Q60 60 30 110T60 200M110 0Q90 70 130 120T110 200M170 0Q150 60 180 110T160 200" stroke-dasharray="2 3"/>
        </g>
        <g fill="#F5B700"><circle cx="100" cy="50" r="4"/><circle cx="130" cy="120" r="4"/><circle cx="30" cy="110" r="4"/></g>
      </svg>
      <div class="marca"><i></i>Tolizzo</div>
      <div>
        <h1>Descubra o que está acontecendo na cidade agora.</h1>
        <p>Veja eventos em andamento, saiba se estão cheios antes de sair de casa e trace o menor caminho até eles.</p>
      </div>
      <div class="rodape">Projeto didático · Java + Spring Boot</div>
    </section>
    <section class="formlado">
      <form class="formbox" onsubmit="return entrar(event)">
        <h2 style="font-size:32px">${cad?'Crie sua conta':'Bem-vindo de volta'}</h2>
        <div class="abas" role="tablist">
          <button type="button" role="tab" aria-selected="${!cad}" onclick="go('#/login')">Entrar</button>
          <button type="button" role="tab" aria-selected="${cad}" onclick="go('#/cadastro')">Criar conta</button>
        </div>
        ${cad?`<div class="campo"><label for="nome">Nome completo</label><input id="nome" required autocomplete="name"></div>`:''}
        <div class="campo"><label for="email">E-mail</label><input id="email" type="email" required autocomplete="email" placeholder="voce@email.com"></div>
        <div class="campo"><label for="senha">Senha</label><input id="senha" type="password" required minlength="6" autocomplete="${cad?'new-password':'current-password'}"></div>
        <button class="btn" style="width:100%">${cad?'Criar conta':'Entrar'}</button>
        <p class="dica">Crie uma conta para começar. Os dados ficam salvos neste navegador.</p>
      </form>
    </section>
  </div>`;
}

function shell(ativo, conteudo, semPadding=false){
  const nav=(h,i,t,k)=>`<a class="nav" href="${h}" ${ativo===k?'aria-current="page"':''}>${ic[i]}${t}</a>`;
  return `<div class="shell">
    <nav class="side" aria-label="Principal">
      <div class="marca"><i></i>Tolizzo</div>
      ${nav('#/eventos','cal','Eventos','eventos')}
      ${nav('#/mapa','map','Mapa geral','mapa')}
      ${nav('#/conta','user','Minha conta','conta')}
      ${nav('#/gestao','cfg','Gestão','gestao')}
      <div class="fim">${nav('#/design','pal','Guia de design','design')}<button onclick="sair()">Sair</button></div>
    </nav>
    ${semPadding?conteudo:`<main>${conteudo}</main>`}
  </div>`;
}

function capa(cat){
  const c=COR[cat];
  const forma = cat==='Festivais'
    ? '<g fill="#fff" opacity=".22"><circle cx="270" cy="30" r="46"/><circle cx="230" cy="100" r="22"/><circle cx="60" cy="118" r="34"/></g>'
    : cat==='Museus'
    ? '<g fill="#fff" opacity=".22"><rect x="190" y="30" width="18" height="100"/><rect x="220" y="30" width="18" height="100"/><rect x="250" y="30" width="18" height="100"/><path d="M180 30 230 0l60 30z"/></g>'
    : '<g fill="#fff" opacity=".22"><circle cx="250" cy="70" r="52"/><circle cx="250" cy="70" r="30"/><rect x="60" y="20" width="10" height="100"/><rect x="90" y="20" width="10" height="100"/></g>';
  return `<svg viewBox="0 0 300 118" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="300" height="118" fill="${c}"/>${forma}</svg>`;
}

function telaEventos(){
  const lista = eventos.filter(e=>(S.cat==='Todos'||e.cat===S.cat)&&e.titulo.toLowerCase().includes((S.q||'').toLowerCase()));
  const chips = ['Todos',...CATS].map(c=>`<button class="chip" aria-pressed="${S.cat===c}" onclick="filtrarCat('${c}')">${c}</button>`).join('');
  const cards = lista.map(e=>{
    const p=poiById(e.poi);
    return `<a class="card" href="#/evento/${e.id}">
      <div class="capa">${capa(e.cat)}<span class="tag">${e.cat}</span>
        <button class="fav" aria-label="Favoritar" aria-pressed="${S.favs.has(e.id)}" onclick="favoritar(event,${e.id})">${ic.heart}</button></div>
      <div class="corpo"><h3>${esc(e.titulo)}</h3>
        <div class="meta"><span>${esc(p?p.nome:'Local')}</span><span>${e.ini}–${e.fim}</span><span style="font-weight:600;color:${aoVivo(e)?'var(--verde)':'var(--tinta-2)'}">${aoVivo(e)?'● Ao vivo':'Fora do horário'}</span></div>
        ${lotHTML(e.lot)}</div></a>`}).join('');
  return shell('eventos',`
    <div class="topo"><div><h1>Acontecendo agora</h1><p>Eventos em andamento e o quanto estão cheios.</p></div>
      <span class="ao-vivo"><i></i>${lista.filter(aoVivo).length} ao vivo agora</span></div>
    <div class="chips" role="group" aria-label="Filtrar por categoria">${chips}</div>
    <input type="search" id="qe" placeholder="Buscar evento" aria-label="Buscar evento" value="${esc(S.q||'')}" style="width:100%;max-width:360px;padding:11px 14px;border:2px solid var(--linha);border-radius:8px;margin-bottom:20px;display:block" oninput="S.q=this.value;route();const q=$('#qe');q.focus();q.setSelectionRange(99,99)">
    <div class="grid">${cards||'<p class="vazio-txt">Nenhum evento nesta categoria agora.</p>'}</div>`);
}

function telaEvento(id){
  const e=eventos.find(x=>x.id===+id); if(!e) return telaEventos();
  const p=poiById(e.poi), [nt,nc]=nivel(e.lot), now=new Date().getHours()*60+new Date().getMinutes(), ag=aoVivo(e)?e.tl.reduce((r,t,i)=>mins(t[0])<=now?i:r,-1):-1;
  const tl=e.tl.map((t,i)=>`<li ${i===ag?'class="agora"':''}><time>${t[0]}</time>${esc(t[1])}${i===ag?' <strong>(agora)</strong>':''}</li>`).join('');
  return shell('eventos',`
    <a class="voltar" href="#/eventos">← Voltar aos eventos</a>
    <div class="topo"><div><span class="tag" style="background:${COR[e.cat]};color:#fff">${e.cat}</span>
      <h1 style="margin-top:10px">${esc(e.titulo)}</h1><p>${esc(p?p.nome:'Local')} · ${e.ini}–${e.fim}</p></div>
      <button class="btn sec" onclick="favoritar(event,${e.id});route()">${S.favs.has(e.id)?'Remover dos favoritos':'Favoritar'}</button></div>
    <div class="det">
      <div class="pilha">
        <section class="painel"><h2>Lotação agora</h2>
          <div class="lotgrande ${nc}">${e.lot}%</div><p style="margin:6px 0 16px;font-weight:600" class="${nc}">${nt}</p>${lotHTML(e.lot)}</section>
        <section class="painel"><h2>Cronograma</h2><ol class="tl">${tl}</ol></section>
      </div>
      <section class="painel"><h2>Onde acontece</h2>
        <div style="border-radius:var(--r-sm);overflow:hidden;box-shadow:0 0 0 1px var(--linha)"><div id="miniMapa" style="height:260px"></div></div>
        <p style="margin:14px 0"><strong>${esc(p?p.nome:'Local')}</strong><br><span class="meta">${p?`Categoria ${p.cat} · ${llTxt(p)}`:''}</span></p>
        ${p?`<button class="btn" style="width:100%" onclick="verNoMapa(${p.id})">Ver no mapa geral</button>`:''}</section>
    </div>`);
}

function telaMapa(){
  return shell('mapa',`
  <div class="mapa-pg">
    <aside class="mapa-lado">
      <header><h1>Mapa geral</h1>
        <input type="search" id="busca" placeholder="Buscar ponto de interesse" aria-label="Buscar ponto de interesse" value="${esc(S.busca)}" oninput="S.busca=this.value;pintaLista()">
        <div class="chips" id="chipsMapa" role="group" aria-label="Filtrar por categoria"></div></header>
      <div class="lista" id="lista"></div>
      <div class="rota" id="rota"></div>
    </aside>
    <section class="mapa-area"><div id="mapa"></div>
      <div class="leg">${CATS.map(c=>`<span style="--c:${COR[c]}">${c}</span>`).join('')}<span style="--c:#F5B700">Rota calculada</span></div></section>
  </div>`,true);
}
function pintaMapa(){
  const c=$('#mapa'); if(!c) return;
  if(!temL()){ c.innerHTML='<p class="vazio-txt" style="padding:24px">Não foi possível carregar o mapa. Verifique sua conexão.</p>' }
  else {
    if(!MAP){ MAP=novoMapa(c); CAM=L.layerGroup().addTo(MAP); if(S.o&&!S.d&&poiById(S.o)) MAP.setView(toLL(poiById(S.o)),16) }
    CAM.clearLayers();
    desenhaMapa(CAM);
    setTimeout(()=>MAP && MAP.invalidateSize(),60);
  }
  $('#chipsMapa').innerHTML=['Todos',...CATS].map(k=>`<button class="chip" aria-pressed="${S.mapCat===k}" onclick="S.mapCat='${k}';pintaLista();pintaMapa()">${k}</button>`).join('');
  pintaRota();
}
function pintaLista(){
  const q=S.busca.trim().toLowerCase();
  const l=pois.filter(p=>(S.mapCat==='Todos'||p.cat===S.mapCat)&&p.nome.toLowerCase().includes(q));
  $('#lista').innerHTML=l.map(p=>`<button class="poi" aria-pressed="${S.o===p.id||S.d===p.id}" onclick="clicarPoi(${p.id})">
    <span class="dot" style="background:${COR[p.cat]}"></span><span>${esc(p.nome)}<small>${p.cat} · ${llTxt(p)}</small></span></button>`).join('')||'<p class="vazio-txt">Nenhum ponto encontrado.</p>';
}
function pintaRota(){
  const o=S.o&&poiById(S.o), d=S.d&&poiById(S.d);
  const res=S.rota?`<div class="res"><strong>${S.rota.metros} m</strong> · ~${Math.max(1,Math.round(S.rota.metros/80))} min a pé<br><span class="meta">${S.rota.caminho.map(i=>esc(poiById(i).nome)).join(' → ')}</span></div>`:'';
  $('#rota').innerHTML=`
    <div class="slot"><b>A</b>${o?esc(o.nome):'<span class="vazio">Escolha a origem no mapa ou na lista</span>'}</div>
    <div class="slot d"><b>B</b>${d?esc(d.nome):'<span class="vazio">Escolha o destino</span>'}</div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn sol" style="flex:1" ${o&&d?'':'disabled'} onclick="calcular()">Calcular menor caminho</button>
      <button class="btn sec" onclick="limpar()">Limpar</button></div>${res}`;
}

function telaConta(){
  const email=ls.get('tolizzo_token',{}).email||'voce@email.com';
  const nome=ls.get('tolizzo_token',{}).nome||'Visitante';
  const favs=eventos.filter(e=>S.favs.has(e.id));
  const hist=ls.get('tolizzo_hist',[]);
  return shell('conta',`
    <div class="perfil"><div class="avatar" aria-hidden="true">${esc(nome[0]||'V').toUpperCase()}</div>
      <div><h1 style="font-size:34px">${esc(nome)}</h1><p style="color:var(--tinta-2)">${esc(email)}</p></div></div>
    <div class="cols">
      <section class="painel"><h2>Dados cadastrais</h2>
        <form onsubmit="return salvarPerfil(event)">
          <div class="campo"><label for="pn">Nome</label><input id="pn" value="${esc(nome)}" required></div>
          <div class="campo"><label for="pe">E-mail</label><input id="pe" type="email" value="${esc(email)}" required></div>
          <div class="campo"><label for="ps">Nova senha</label><input id="ps" type="password" placeholder="Deixe em branco para manter"></div>
          <button class="btn">Salvar alterações</button></form></section>
      <div class="pilha">
        <section class="painel"><h2>Eventos favoritos</h2>
          ${favs.map(e=>`<div class="item"><a href="#/evento/${e.id}" style="font-weight:600">${esc(e.titulo)}</a><span class="meta">${e.cat}</span></div>`).join('')||'<p class="vazio-txt">Toque no coração de um evento para guardá-lo aqui.</p>'}</section>
        <section class="painel"><h2>Histórico de rotas</h2>
          ${hist.map(h=>`<div class="item"><span>${esc(h.de)} → ${esc(h.para)}</span><strong>${h.m} m</strong></div>`).join('')||'<p class="vazio-txt">Calcule uma rota no mapa geral para vê-la aqui.</p>'}</section>
      </div>
    </div>`);
}

function telaGestao(){
  return shell('gestao',`
    <div class="topo"><div><h1>Gestão</h1><p>Cadastre, ajuste e remova pontos e eventos.</p></div><button class="btn sec" onclick="resetar()">Restaurar dados originais</button></div>
    <div class="cols">
      <section class="painel"><h2>Novo ponto de interesse</h2>
        <form onsubmit="return novoPoi(event)">
          <div class="campo"><label for="gn">Nome</label><input id="gn" required maxlength="60"></div>
          <div class="campo"><label for="gc">Categoria</label><select id="gc">${CATS.map(c=>`<option>${c}</option>`).join('')}</select></div>
          <p class="dica" style="margin:0 0 8px">Clique no mapa para posicionar o ponto.</p><div id="mapaGestao" style="height:240px;margin-bottom:16px"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="campo"><label for="gx">Coordenada X (0–100)</label><input id="gx" type="number" min="0" max="100" required></div>
            <div class="campo"><label for="gy">Coordenada Y (0–100)</label><input id="gy" type="number" min="0" max="100" required></div></div>
          <button class="btn">Salvar ponto</button></form></section>
      <section class="painel"><h2>Novo evento</h2>
        <form onsubmit="return novoEvento(event)">
          <div class="campo"><label for="et">Título</label><input id="et" required maxlength="80"></div>
          <div class="campo"><label for="ec">Categoria</label><select id="ec">${CATS.map(c=>`<option>${c}</option>`).join('')}</select></div>
          <div class="campo"><label for="ep">Ponto de interesse</label><select id="ep">${pois.map(p=>`<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</select></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="campo"><label for="ei">Início</label><input id="ei" type="time" required></div>
            <div class="campo"><label for="ef">Fim</label><input id="ef" type="time" required></div></div>
          <button class="btn">Salvar evento</button></form></section>
    </div>
    <div class="cols" style="margin-top:24px">
      <section class="painel"><h2>Eventos cadastrados</h2>
        ${eventos.map(e=>`<div class="item" style="align-items:center;flex-wrap:wrap"><span style="font-weight:600;flex:1;min-width:150px">${esc(e.titulo)}<small class="meta" style="display:block">${e.ini}–${e.fim}</small></span>
          <label class="meta">Lotação <input type="range" min="0" max="100" value="${e.lot}" oninput="setLot(${e.id},this.value)"> <output id="lo${e.id}">${e.lot}%</output></label>
          <button class="btn sec" style="padding:6px 12px" onclick="delEvento(${e.id})">Excluir</button></div>`).join('')||'<p class="vazio-txt">Nenhum evento cadastrado.</p>'}</section>
      <section class="painel"><h2>Pontos cadastrados</h2>
        ${pois.map(p=>`<div class="item" style="align-items:center"><span style="font-weight:600">${esc(p.nome)}<small class="meta" style="display:block">${p.cat} · ${llTxt(p)}</small></span>
          <button class="btn sec" style="padding:6px 12px" onclick="delPoi(${p.id})">Excluir</button></div>`).join('')||'<p class="vazio-txt">Nenhum ponto cadastrado.</p>'}</section>
    </div>`);
}

function telaDesign(){
  const cores=[['Cobalto','#2340D8','#fff'],['Cobalto escuro','#172A94','#fff'],['Tinta','#14213D','#fff'],['Sol','#F5B700','#14213D'],['Papel','#EEF2F8','#14213D'],['Linha','#D5DCEA','#14213D'],['Verde (tranquilo)','#137A55','#fff'],['Âmbar (movimentado)','#9A6700','#fff'],['Vermelho (lotado)','#C0392B','#fff'],['Museus','#0F766E','#fff'],['Gastronomia','#D9480F','#fff']];
  return shell('design',`
    <div class="topo"><div><h1>Guia de design para o Figma</h1><p>Tokens e medidas para recriar estas telas como componentes.</p></div></div>
    <div class="pilha">
      <section class="painel"><h2>Cores (Color styles)</h2><div class="sw">${cores.map(c=>`<div style="background:${c[1]};color:${c[2]}">${c[0]}<span>${c[1]}</span></div>`).join('')}</div></section>
      <section class="painel"><h2>Tipografia (Text styles)</h2>
        <div class="rolar"><table><tr><th>Estilo</th><th>Fonte</th><th>Tamanho / peso</th></tr>
        <tr><td>Título de página</td><td>Bricolage Grotesque</td><td>38 / Bold</td></tr>
        <tr><td>Título de card</td><td>Bricolage Grotesque</td><td>21 / Bold</td></tr>
        <tr><td>Número de lotação</td><td>Bricolage Grotesque</td><td>56 / ExtraBold</td></tr>
        <tr><td>Corpo</td><td>Figtree</td><td>16 / Regular</td></tr>
        <tr><td>Rótulo e botão</td><td>Figtree</td><td>14–16 / SemiBold</td></tr></table></div></section>
      <section class="painel"><h2>Frames e grid</h2>
        <div class="rolar"><table><tr><th>Frame</th><th>Tamanho</th><th>Observação</th></tr>
        <tr><td>Desktop</td><td>1440 × 900</td><td>Sidebar 232 px; conteúdo com padding 40 px</td></tr>
        <tr><td>Mapa geral</td><td>1440 × 900</td><td>Painel de POIs 350 px + mapa (resto)</td></tr>
        <tr><td>Mobile</td><td>390 × 844</td><td>Sidebar vira barra superior; grid de 1 coluna</td></tr>
        <tr><td>Espaçamento</td><td colspan="2">4 · 8 · 12 · 16 · 24 · 40 px</td></tr>
        <tr><td>Raios</td><td colspan="2">8 (campos, botões) · 14 (cards) · 22 (painéis grandes)</td></tr></table></div></section>
      <section class="painel"><h2>Componentes sugeridos (Components + Variants)</h2>
        <div class="rolar"><table><tr><th>Componente</th><th>Variantes</th></tr>
        <tr><td>Botão</td><td>Primário · Secundário · Destaque (sol) · Desabilitado</td></tr>
        <tr><td>Chip de filtro</td><td>Normal · Selecionado</td></tr>
        <tr><td>Indicador de lotação</td><td>Tranquilo (&lt; 50%) · Movimentado (50–79%) · Lotado (≥ 80%)</td></tr>
        <tr><td>Card de evento</td><td>Festivais · Museus · Gastronomia</td></tr>
        <tr><td>Item de POI</td><td>Normal · Selecionado</td></tr>
        <tr><td>Marcador do mapa</td><td>Normal · Origem (A) · Destino (B)</td></tr>
        <tr><td>Item da sidebar</td><td>Normal · Ativo</td></tr></table></div></section>
    </div>`);
}

/* ---------- Ações ---------- */
function go(h){ location.hash=h }
async function entrar(ev){
  ev.preventDefault();
  const email=$('#email').value.trim().toLowerCase(), cad=!!$('#nome'), us=ls.get('tolizzo_users',[]), h=await hash($('#senha').value);
  let u=us.find(x=>x.email===email);
  if(cad){ if(u) return aviso('Este e-mail já tem cadastro'); u={email,nome:$('#nome').value.trim(),h}; us.push(u); ls.set('tolizzo_users',us) }
  else if(!u||u.h!==h) return aviso('E-mail ou senha incorretos');
  ls.set('tolizzo_token',{token:'tz-'+Date.now(),email:u.email,nome:u.nome}); go('#/eventos'); return false;
}
function sair(){ ls.del('tolizzo_token'); go('#/login') }
function filtrarCat(c){ S.cat=c; route() }
function favoritar(ev,id){ ev.preventDefault(); ev.stopPropagation(); S.favs.has(id)?S.favs.delete(id):S.favs.add(id); salvar(); if(location.hash.startsWith('#/eventos')||location.hash==='')route() }
function verNoMapa(id){ S.o=id; S.d=null; S.rota=null; go('#/mapa') }
function clicarPoi(id){
  if(!S.o||(S.o&&S.d)){ S.o=id; S.d=null }
  else if(id!==S.o){ S.d=id }
  S.rota=null; pintaMapa(); pintaLista();
}
function calcular(){
  const r=menorCaminho(S.o,S.d); S.rota=r; pintaMapa(); if(!r) aviso('Não há caminho ligando esses pontos');
  if(r){ const h=ls.get('tolizzo_hist',[]); h.unshift({de:poiById(S.o).nome,para:poiById(S.d).nome,m:r.metros}); ls.set('tolizzo_hist',h.slice(0,8)) }
}
function limpar(){ S.o=S.d=null; S.rota=null; pintaMapa(); pintaLista() }
async function salvarPerfil(ev){
  ev.preventDefault();
  const t=ls.get('tolizzo_token',{}), us=ls.get('tolizzo_users',[]), u=us.find(x=>x.email===t.email), ne=$('#pe').value.trim().toLowerCase(), ps=$('#ps').value;
  if(ne!==t.email&&us.some(x=>x.email===ne)){ aviso('Este e-mail já está em uso'); return false }
  if(ps&&ps.length<6){ aviso('A senha precisa de 6+ caracteres'); return false }
  if(u){ u.nome=$('#pn').value; u.email=ne; if(ps) u.h=await hash(ps); ls.set('tolizzo_users',us) }
  t.nome=$('#pn').value; t.email=ne; ls.set('tolizzo_token',t); aviso('Dados salvos'); route(); return false;
}
function novoPoi(ev){
  ev.preventDefault();
  const id=Math.max(0,...pois.map(p=>p.id))+1, n={id,nome:$('#gn').value.trim(),cat:$('#gc').value,x:+$('#gx').value,y:+$('#gy').value};
  const viz=pois.map(p=>[dist(p,n),p.id]).sort((a,b)=>a[0]-b[0]).slice(0,2);
  pois.push(n); viz.forEach(v=>arestas.push([id,v[1]])); salvar();
  aviso('Ponto salvo e ligado aos vizinhos mais próximos'); route(); return false;
}
function novoEvento(ev){
  ev.preventDefault();
  if(!pois.length){ aviso('Cadastre um ponto de interesse primeiro'); return false }
  const i=$('#ei').value, f=$('#ef').value;
  if(i===f){ aviso('Início e fim não podem ser iguais'); return false }
  eventos.push({id:Math.max(0,...eventos.map(e=>e.id))+1,titulo:$('#et').value.trim(),cat:$('#ec').value,poi:+$('#ep').value,lot:0,ini:i,fim:f,tl:[[i,'Abertura'],[f,'Encerramento']]});
  salvar(); aviso('Evento salvo'); route(); return false;
}
function setLot(id,v){ const e=eventos.find(x=>x.id===id); e.lot=+v; $('#lo'+id).textContent=v+'%'; salvar() }
function delEvento(id){ if(!confirm('Excluir este evento?')) return; eventos=eventos.filter(e=>e.id!==id); S.favs.delete(id); salvar(); route() }
function delPoi(id){
  if(!confirm('Excluir este ponto, as vias ligadas a ele e os eventos que acontecem nele?')) return;
  const ids=eventos.filter(e=>e.poi===id).map(e=>e.id);
  pois=pois.filter(p=>p.id!==id); arestas=arestas.filter(a=>!a.includes(id)); eventos=eventos.filter(e=>e.poi!==id);
  ids.forEach(i=>S.favs.delete(i)); S.o=S.d=S.rota=null; salvar(); route();
}
function resetar(){ if(!confirm('Restaurar pontos, eventos e favoritos originais?')) return; const d=JSON.parse(DEF); pois=d.pois; eventos=d.eventos; arestas=d.arestas; S.favs=new Set([1]); S.o=S.d=S.rota=null; salvar(); route() }
function aviso(t){ const d=document.createElement('div'); d.className='toast'; d.setAttribute('role','status'); d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),2200) }

/* ---------- Roteador por hash (compatível com GitHub Pages) ---------- */
function route(){
  const [nome,arg]=(location.hash.replace(/^#\/?/,'')||'login').split('/');
  if(!logado() && !['login','cadastro','design'].includes(nome)){ return go('#/login') }
  if(logado() && ['login','cadastro'].includes(nome)){ return go('#/eventos') }
  const app=$('#app');
  const mapa={login:()=>telaLogin(),cadastro:()=>telaLogin('cadastro'),eventos:telaEventos,evento:()=>telaEvento(arg),mapa:telaMapa,conta:telaConta,gestao:telaGestao,design:telaDesign};
  MAPS.forEach(m=>m.remove()); MAPS=[]; MAP=null;
  app.innerHTML=(mapa[nome]||telaEventos)();
  window.scrollTo(0,0);
  if(nome==='mapa'){ pintaMapa(); pintaLista() }
  if(nome==='evento') miniMapa(arg);
  if(nome==='gestao') mapaGestao();
}
window.addEventListener('hashchange',route);
route();
