/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
Starts http and https proxies to use to test actions within Kibana or with curl.

Assumes you have elasticsearch running on https://elastic:changeme@localhost:9200,
otherwise expect 500 responses from those requests.  All other requests should
work as expected.

# start 4 proxies:

node x-pack/plugins/actions/server/manual_tests/forward_proxy.js http-8080-open http-8081-auth https-8443-open https-8444-auth

# issue some requests through the proxies

curl -k --no-alpn -o /dev/null --proxy-insecure -x  http://127.0.0.1:8080                                 http://www.example.com; \
curl -k --no-alpn -o /dev/null --proxy-insecure -x  http://127.0.0.1:8080                                https://www.example.com; \
curl -k --no-alpn -o /dev/null --proxy-insecure -x https://127.0.0.1:8443                                 http://www.example.com; \
curl -k --no-alpn -o /dev/null --proxy-insecure -x https://127.0.0.1:8443                                https://www.example.com; \
curl -k --no-alpn -o /dev/null --proxy-insecure -x  http://127.0.0.1:8080                                https://elastic:changeme@localhost:9200; \
curl -k --no-alpn -o /dev/null --proxy-insecure -x https://127.0.0.1:8443                                https://elastic:changeme@localhost:9200; \
curl -k --no-alpn -o /dev/null --proxy-insecure -x  http://127.0.0.1:8081 --proxy-user elastic:changeme   http://www.example.com; \
curl -k --no-alpn -o /dev/null --proxy-insecure -x  http://127.0.0.1:8081 --proxy-user elastic:changeme  https://www.example.com; \
curl -k --no-alpn -o /dev/null --proxy-insecure -x https://127.0.0.1:8444 --proxy-user elastic:changeme   http://www.example.com; \
curl -k --no-alpn -o /dev/null --proxy-insecure -x https://127.0.0.1:8444 --proxy-user elastic:changeme  https://www.example.com; \
curl -k --no-alpn -o /dev/null --proxy-insecure -x  http://127.0.0.1:8081 --proxy-user elastic:changeme  https://elastic:changeme@localhost:9200; \
curl -k --no-alpn -o /dev/null --proxy-insecure -x https://127.0.0.1:8444 --proxy-user elastic:changeme  https://elastic:changeme@localhost:9200; \
echo done - you should run all the lines above as one command

*/

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const proxySetup = require('proxy');

const PROGRAM = path.basename(__filename).replace(/.js$/, '');
const CertDir = path.resolve(__dirname, '../../../../../packages/kbn-dev-utils/certs');

const Auth = 'elastic:changeme';
const AuthB64 = Buffer.from(Auth).toString('base64');

const HttpsOptions = {
  key: fs.readFileSync(path.join(CertDir, 'kibana.key'), 'utf8'),
  cert: fs.readFileSync(path.join(CertDir, 'kibana.crt'), 'utf8'),
};

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    help();
    process.exit(1);
  }

  const specs = args.map(argToSpec);
  for (const spec of specs) {
    const { protocol, port, auth } = spec;
    createServer(protocol, port, auth);
  }
}

/** @type { (protocol: string, port: number, auth: boolean) => Promise<http.Server | httpServer> } */
async function createServer(protocol, port, auth) {
  let proxyServer;

  if (protocol === 'http') {
    proxyServer = http.createServer();
  } else {
    proxyServer = https.createServer(HttpsOptions);
  }

  proxySetup(proxyServer);

  let authLabel = '';
  if (auth) {
    authLabel = `${Auth}@`;
    proxyServer.authenticate = (req, callback) => {
      const auth = req.headers['proxy-authorization'];
      callback(null, auth === `Basic ${AuthB64}`);
    };
  }

  const serverLabel = `${protocol}://${authLabel}localhost:${port}`;
  proxyServer.listen(port, 'localhost', () => {
    console.log(`proxy server started on ${serverLabel}`);
  });
}

/* convert 'proto-port-auth' into object with shape shown below */
/** @type { (arg: string) => void | { protocol: string, port: number, auth: boolean } } */
function argToSpec(arg) {
  const parts = arg.split('-');
  if (parts.length < 2) {
    return logError(`invalid spec: ${arg}`);
  }

  const [protocol, portString, authString] = parts;

  if (!protocol) return logError(`empty protocol in '${arg}'`);
  if (protocol !== 'http' && protocol !== 'https')
    return logError(`invalid protocol in '${arg}': '${protocol}'`);

  if (!portString) return logError(`empty port in '${arg}'`);
  const port = Number.parseInt(portString, 10);
  if (isNaN(port)) return logError(`invalid port in '${arg}': ${portString}`);

  let auth;
  if (!authString) {
    auth = false;
  } else {
    if (authString !== 'auth' && authString !== 'open')
      return logError(`invalid auth in '${arg}': '${authString}'`);
    auth = authString === 'auth';
  }

  return { protocol, port, auth };
}

/** @type { (message: string) => void } */
function log(message) {
  console.log(`${new Date().toISOString()} - ${message}`);
}

/** @type { (message: string) => void } */
function logError(message) {
  log(message);
  process.exit(1);
}

main();

function help() {
  console.log(`${PROGRAM} - create http proxies to test connectors with`);
  console.log(`usage:`);
  console.log(`  ${PROGRAM} spec spec spec ...`);
  console.log(``);
  console.log(`options:`);
  console.log(`  - none yet`);
  console.log(``);
  console.log(`parameters:`);
  console.log(`  spec: spec is a 3-part token, separated by '-' chars`);
  console.log(`    [proto]-[port]-[auth]`);
  console.log(`      proto - 'http' or 'https'`);
  console.log(`      port  - port to open the proxy on`);
  console.log(`      auth  - 'auth' or 'open' (auth expects user/pass elastic:change)`);
  console.log(``);
  console.log(`example:`);
  console.log(`  ${PROGRAM} {options} http-8080-open https-8443-open`);
  console.log(`  `);
}
