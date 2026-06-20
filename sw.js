const CACHE_NAME = 'simple-survey-v1.5.1';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// インストール時にアプリの基本リソースをキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除（バージョン更新時用）
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== 'map-cache') {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// フェッチ処理（オフライン対応と地図タイルのキャッシュ）
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 地理院地図タイルとOpenStreetMapの画像リクエストを動的にキャッシュ
    if (requestUrl.hostname.includes('cyberjapandata.gsi.go.jp') || requestUrl.hostname.includes('openstreetmap.org')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                
                return fetch(event.request).then((networkResponse) => {
                    return caches.open('map-cache').then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }).catch(() => {
                    // オフライン時、キャッシュにないタイルの代替処理（エラー回避）
                    return new Response(''); 
                });
            })
        );
        return;
    }

    // 通常のリソースは「キャッシュ優先、無ければネットワーク」
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
