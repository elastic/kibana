/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * FTR port of the Scout API test for kibana#258232 (PKI session invalidation on HTTP/2 RST_STREAM).
 *
 * On main, the equivalent deterministic test lives at:
 *   x-pack/platform/plugins/shared/security/test/scout_pki_stress/api/tests/pki_http2_stream_cancel.spec.ts
 *
 * Scout's HTTP/2 support (kbn-scout `http2: true` server config, #274000) was not backported to
 * 8.19, so this file carries the FTR equivalent. The test logic is identical — only the test
 * harness glue (Playwright vs. mocha, expect.poll vs. retry.tryForTime) differs.
 *
 * Design note: the pre-auth hold in init_routes.ts parks the request inside
 * PKIAuthenticationProvider.authenticate (not onPreAuth). An RST_STREAM sent during onPreAuth would
 * make Hapi set _isReplied and skip Auth entirely, so PKI would never see the degraded socket and
 * the test would pass vacuously even without the pki.ts guard. Parking inside authenticate keeps
 * the in-flight Auth lifecycle running across the RST, which is the window that triggers the bug.
 */

import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import http2 from 'http2';
import type { IncomingHttpHeaders } from 'http2';
import { parse as parseCookie } from 'tough-cookie';

import { CA_CERT_PATH } from '@kbn/dev-utils';
import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

const CA_CERT = readFileSync(CA_CERT_PATH);
const FIRST_CLIENT_CERT = readFileSync(
  require.resolve('@kbn/security-api-integration-helpers/pki/first_client.p12')
);

const PREAUTH_HOLD_HEADER = 'x-elastic-preauth-hold';

interface PkiHttp2RequestOptions {
  path: string;
  headers?: Record<string, string>;
}

interface PkiHttp2Response {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: string;
}

/** HTTP/2 client that exposes streams so tests can RST after a server-side pre-auth hold parks. */
class PkiHttp2Client {
  private session: http2.ClientHttp2Session | undefined;

  constructor(private readonly kibanaUrl: string, private readonly pfx: Buffer) {}

  async connect(): Promise<void> {
    const session = http2.connect(this.kibanaUrl, {
      pfx: this.pfx,
      passphrase: '',
      ca: CA_CERT,
    });

    this.session = await new Promise<http2.ClientHttp2Session>((resolve, reject) => {
      session.once('connect', () => resolve(session));
      session.once('error', reject);
    });
  }

  request({ path, headers = {} }: PkiHttp2RequestOptions): {
    stream: http2.ClientHttp2Stream;
    response: Promise<PkiHttp2Response>;
  } {
    if (!this.session) {
      throw new Error('PkiHttp2Client.connect() must be called before request()');
    }

    const stream = this.session.request({
      ':method': 'GET',
      ':path': path,
      ...headers,
    });
    stream.end();

    let statusCode = 0;
    let responseHeaders: IncomingHttpHeaders = {};
    let body = '';

    const response = new Promise<PkiHttp2Response>((resolvePromise) => {
      stream.on('response', (h) => {
        responseHeaders = h;
        statusCode = Number(h[':status']);
      });
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        body += chunk;
      });
      stream.on('end', () => {
        resolvePromise({ statusCode, headers: responseHeaders, body });
      });
      // RST_STREAM (NGHTTP2_CANCEL) is an expected test signal. A locally cancelled stream
      // emits 'close' without 'end' or 'error', so settle on 'close' as well.
      stream.on('error', () => {
        resolvePromise({ statusCode, headers: responseHeaders, body });
      });
      stream.on('close', () => {
        resolvePromise({ statusCode, headers: responseHeaders, body });
      });
    });

    return { stream, response };
  }

  close(): void {
    this.session?.close();
    this.session = undefined;
  }
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const config = getService('config');

  describe('PKI HTTP/2 stream cancel', () => {
    before(async () => {
      await getService('esSupertest')
        .post('/_security/role_mapping/first_client_pki')
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
        .delete('/_security/role_mapping/first_client_pki')
        .ca(CA_CERT)
        .expect(200);
    });

    it('cancelling one stream during PKI auth does not revoke the session', async () => {
      const kibanaUrl = config.get('servers.kibana');
      const kibanaOrigin = `https://${kibanaUrl.hostname}:${kibanaUrl.port}`;

      const pkiHttp2 = new PkiHttp2Client(kibanaOrigin, FIRST_CLIENT_CERT);
      await pkiHttp2.connect();

      try {
        // Step 1: login — establish a PKI session over HTTP/2.
        let sidCookie: string;
        {
          const login = pkiHttp2.request({ path: '/security/account' });
          const loginResponse = await login.response;
          expect(loginResponse.statusCode).to.be(200);

          const setCookieHeader = loginResponse.headers['set-cookie'];
          const rawCookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
          const sid = rawCookies
            .map((raw) => (raw ? parseCookie(raw) : null))
            .find((c) => c?.key === 'sid');
          if (!sid) {
            throw new Error('No sid cookie in PKI login response');
          }
          sidCookie = `${sid.key}=${sid.value}`;
        }

        const holdId = randomUUID();

        const getHoldStatus = async (): Promise<{
          parked: boolean;
          continuedAfterHold: boolean;
          authCompleted: boolean;
          authorized: boolean | null;
          peerCertificateNull: boolean;
        }> => {
          // The client certificate is required even though this route sets authc.enabled=false:
          // pki.config.ts runs Kibana with `server.ssl.clientAuthentication=required`, which maps to
          // Node TLS `requestCert: true, rejectUnauthorized: true` (see kbn-server-http-tools
          // ssl_config.ts). A certless connection is rejected during the TLS handshake, before
          // routing — so skipping app-layer auth does not remove the mutual-TLS requirement.
          const response = await supertest
            .get(`/authentication/preauth_holds/${holdId}`)
            .ca(CA_CERT)
            .pfx(FIRST_CLIENT_CERT)
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          return response.body;
        };

        // Step 2: fire the victim request with the pre-auth hold header, then wait until it parks
        // inside PKIAuthenticationProvider.authenticate.
        const victim = pkiHttp2.request({
          path: '/internal/security/me',
          headers: {
            'kbn-xsrf': 'xxx',
            cookie: sidCookie,
            [PREAUTH_HOLD_HEADER]: holdId,
          },
        });

        // Wait until parked — the hold route reports parked=true once the wrapped authenticate
        // function has received the request and is waiting for the release signal.
        // Kept well under PREAUTH_HOLD_TIMEOUT_MS (10s): that budget starts when the request parks
        // and has to cover step 3 too, so a failure to park must surface quickly rather than eat it.
        await retry.tryForTime(5000, async () => {
          const status = await getHoldStatus();
          if (!status.parked) {
            throw new Error(`Hold ${holdId} not yet parked`);
          }
        });

        // Verify the socket was healthy when the request was parked.
        {
          const parked = await getHoldStatus();
          expect(parked.authorized).to.be(true);
          expect(parked.peerCertificateNull).to.be(false);
        }

        // Step 3: RST the stream. Then wait until the hold confirms degradation happened while the
        // stream was still parked (continuedAfterHold=false distinguishes RST-during-hold from
        // normal hold timeout, which would also degrade the socket after the fact).
        victim.stream.close(http2.constants.NGHTTP2_CANCEL);

        // continuedAfterHold latches true permanently once the hold resolves, so once it is true the
        // condition below can never be satisfied: the RST failed to degrade the socket before
        // PREAUTH_HOLD_TIMEOUT_MS (10s) expired and the hold self-released. retry.tryForTime() retries
        // on any throw, so signalling that by throwing would just poll for the full timeout and report
        // a misleading "not yet degraded". Instead, record it and return so the retry exits at once,
        // then surface the real cause outside the loop.
        let holdExpiredBeforeDegradation: string | undefined;

        await retry.tryForTime(8000, async () => {
          const hold = await getHoldStatus();

          if (hold.continuedAfterHold === true) {
            holdExpiredBeforeDegradation =
              `Hold ${holdId} self-released before the RST degraded the socket ` +
              `(PREAUTH_HOLD_TIMEOUT_MS elapsed). The test is not exercising the ` +
              `destroyed-socket-during-auth path. ` +
              `peerCertificateNull=${hold.peerCertificateNull} authorized=${hold.authorized}`;
            return;
          }

          if (!(hold.peerCertificateNull === true && hold.authorized !== true)) {
            throw new Error(
              `Socket not yet degraded while parked: continuedAfterHold=${hold.continuedAfterHold} peerCertificateNull=${hold.peerCertificateNull} authorized=${hold.authorized}`
            );
          }
        });

        if (holdExpiredBeforeDegradation) {
          throw new Error(holdExpiredBeforeDegradation);
        }

        // Step 4: release — let PKI authenticate continue with the degraded socket.
        // Client certificate required for the TLS handshake, as above.
        await supertest
          .post(`/authentication/preauth_holds/${holdId}/release`)
          .ca(CA_CERT)
          .pfx(FIRST_CLIENT_CERT)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        // Wait for the auth lifecycle to complete. continuedAfterHold is set before
        // authenticateViaState finishes, so polling on authCompleted avoids racing a follow-up.
        await retry.tryForTime(8000, async () => {
          const hold = await getHoldStatus();
          if (!hold.continuedAfterHold) {
            throw new Error(`Hold ${holdId}: continuedAfterHold not yet true`);
          }
        });
        await retry.tryForTime(8000, async () => {
          const hold = await getHoldStatus();
          if (!hold.authCompleted) {
            throw new Error(`Hold ${holdId}: authCompleted not yet true`);
          }
        });

        // Step 5: follow-up — the session must still be valid.
        const followUp = pkiHttp2.request({
          path: '/internal/security/me',
          headers: {
            'kbn-xsrf': 'xxx',
            cookie: sidCookie,
          },
        });
        const followUpResponse = await followUp.response;
        expect(followUpResponse.statusCode).to.be(200);

        const followUpBody = JSON.parse(followUpResponse.body);
        expect(followUpBody.username).to.be('first_client');
        // The Kibana *provider* is named 'pki' because pki.config.ts uses the array form
        // `authc.providers=['pki','basic']`, where the provider name equals its type. 'pki1' is the
        // Elasticsearch *realm* name and surfaces in `authentication_realm`, not here.
        expect(followUpBody.authentication_provider).to.eql({ name: 'pki', type: 'pki' });
      } finally {
        pkiHttp2.close();
      }
    });
  });
}
