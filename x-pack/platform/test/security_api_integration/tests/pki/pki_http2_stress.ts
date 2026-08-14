/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Regression test for kibana#258232: PKI sessions invalidated on HTTP/2 stream destruction.
 *
 * Background
 * ----------
 * Kibana 9.x defaults server.protocol to http2 when ssl.enabled is true. HTTP/2 multiplexes
 * all requests over a single TLS connection using per-request "streams." When a stream is
 * destroyed (RST_STREAM from AbortController, browser navigation cancel, search abort),
 * Node.js clears the stream's session reference. Kibana's KibanaSocket reads authorized via
 * a proxy that depends on that reference, so it returns undefined instead of true or false.
 *
 * The guard in pki.ts that protects against this case used a truthy check:
 *   if (peerCertificate === null && request.socket.authorized) { ... }
 * undefined is falsy, so the guard was skipped. The token was invalidated and the session
 * was destroyed, logging the user out.
 *
 * Why supertest cannot reproduce this
 * ------------------------------------
 * supertest uses HTTP/1.1. It cannot send RST_STREAM, which is an HTTP/2-only signal.
 * This test uses a raw http2.connect() client (Node.js built-in) to send real RST_STREAM
 * frames, reproducing the exact failure mode from production.
 *
 * What this test does
 * -------------------
 * 1. Establish a PKI session over HTTPS (supertest / HTTP 1.1 — simple, reliable).
 * 2. Open an HTTP/2 connection to Kibana with the same client certificate.
 * 3. Fire CANCEL_COUNT concurrent slow requests (/authentication/slow/me, 10s hold).
 *    These give Kibana time to run the auth lifecycle before the stream is cancelled.
 * 4. After a short delay, send RST_STREAM (NGHTTP2_CANCEL) for all of them.
 * 5. Immediately send a normal (non-cancelled) request on the same HTTP/2 session.
 * 6. Assert that the non-cancelled request returns 200 with the user's identity — proving
 *    the session was NOT invalidated by any of the RST_STREAM frames.
 *
 * Before the fix: at least one RST_STREAM would destroy the stream during the auth
 * lifecycle, authorized would return undefined, the token would be invalidated, and step 6
 * would return 401.
 *
 * After the fix: all RST_STREAM frames are handled gracefully; the session survives.
 */

import { readFileSync } from 'fs';
import http2 from 'http2';
import { setTimeout as setTimeoutAsync } from 'timers/promises';

import { CA_CERT_PATH } from '@kbn/dev-utils';
import expect from '@kbn/expect';
import { findSessionCookie } from '@kbn/security-api-integration-helpers';

import type { FtrProviderContext } from '../../ftr_provider_context';

const CA_CERT = readFileSync(CA_CERT_PATH);
const FIRST_CLIENT_CERT = readFileSync(
  require.resolve('@kbn/security-api-integration-helpers/pki/first_client.p12')
);

// Number of RST_STREAM requests to fire. More = higher probability of hitting the narrow
// timing window where a stream is destroyed during the auth lifecycle's async session lookup.
const CANCEL_COUNT = 20;

// How long to wait (ms) after sending requests before issuing RST_STREAM. Long enough that
// Kibana has started processing (entered the async session lookup) but short enough that the
// slow endpoint is still holding.
const RST_DELAY_MS = 150;

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');

  describe('PKI HTTP/2 RST_STREAM regression (kibana#258232)', function () {
    this.timeout(60_000);

    before(async () => {
      await getService('esSupertest')
        .post('/_security/role_mapping/first_client_pki_stress')
        .ca(CA_CERT)
        .send({
          roles: ['kibana_admin'],
          enabled: true,
          rules: { field: { dn: 'CN=first_client' } },
        })
        .expect(200);
    });

    after(async () => {
      await getService('esSupertest')
        .delete('/_security/role_mapping/first_client_pki_stress')
        .ca(CA_CERT)
        .expect(200);
    });

    it('session survives concurrent RST_STREAM cancellations on the same HTTP/2 connection', async function () {
      // Step 1: Establish a PKI session. supertest uses HTTP/1.1 which is fine here;
      // the session cookie is protocol-agnostic.
      const loginResponse = await supertest
        .get('/security/account')
        .ca(CA_CERT)
        .pfx(FIRST_CLIENT_CERT)
        .expect(200);

      const sessionCookie = findSessionCookie(loginResponse.headers['set-cookie']);
      expect(sessionCookie).to.be.ok();

      const { hostname, port } = config.get('servers.kibana');
      const kibanaUrl = `https://${hostname}:${port}`;

      // Step 2: Open a raw HTTP/2 connection with the PKI client certificate.
      // All subsequent requests in this test share this one connection (one TLS session,
      // multiple HTTP/2 streams) — mirroring what a browser does.
      const session = await new Promise<http2.ClientHttp2Session>((resolve, reject) => {
        const s = http2.connect(kibanaUrl, {
          pfx: FIRST_CLIENT_CERT,
          passphrase: '',
          ca: CA_CERT,
          rejectUnauthorized: true,
        });
        s.once('connect', () => resolve(s));
        s.once('error', reject);
      });

      try {
        // Step 3: Fire CANCEL_COUNT concurrent slow requests. Each opens a new HTTP/2 stream.
        // The /authentication/slow/me endpoint waits `duration` seconds before responding, so
        // Kibana's auth lifecycle runs immediately but the response stays open for 10 seconds —
        // giving us a reliable window to send RST_STREAM while auth state is held in memory.
        const slowRequests = Array.from({ length: CANCEL_COUNT }, () => {
          const req = session.request({
            ':method': 'POST',
            ':path': '/authentication/slow/me',
            cookie: sessionCookie.cookieString(),
            'kbn-xsrf': 'xxx',
            'content-type': 'application/json',
          });
          req.write(JSON.stringify({ duration: '10s', client: 'start-contract' }));
          req.end();
          // Silence unhandled stream errors caused by RST_STREAM — expected for cancelled streams.
          req.on('error', () => {});
          return req;
        });

        // Step 4: After a short delay (auth lifecycle is now running / session lookup in flight),
        // cancel every slow stream with RST_STREAM NGHTTP2_CANCEL.
        await setTimeoutAsync(RST_DELAY_MS);
        for (const req of slowRequests) {
          req.close(http2.constants.NGHTTP2_CANCEL);
        }

        // Step 5: On the SAME HTTP/2 session (same underlying TLS connection), send a normal
        // verification request. This request shares the session with the cancelled streams —
        // if any RST_STREAM caused the auth lifecycle to invalidate the ES access token or delete
        // the server-side session, this request will return 401 instead of 200.
        const verifyResult = await new Promise<{ username?: string; statusCode?: number }>(
          (resolve, reject) => {
            const req = session.request({
              ':method': 'GET',
              ':path': '/internal/security/me',
              cookie: sessionCookie.cookieString(),
              'kbn-xsrf': 'xxx',
            });
            req.end();

            let statusCode = 0;
            req.on('response', (headers) => {
              statusCode = headers[':status'] as number;
            });

            let body = '';
            req.setEncoding('utf8');
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                resolve({ ...parsed, statusCode });
              } catch {
                resolve({ statusCode });
              }
            });
            req.on('error', reject);
          }
        );

        // Step 6: Assert the session is intact. A 401 here means at least one RST_STREAM
        // triggered token invalidation, which is the bug. The fix makes this 200.
        expect(verifyResult.statusCode).to.be(200);
        expect(verifyResult.username).to.be('first_client');
      } finally {
        session.close();
      }
    });
  });
}
