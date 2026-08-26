/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, apiTest as test } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  getSAMLRequestId,
  getSAMLResponse,
} from '@kbn/security-api-integration-helpers/saml/saml_tools';
import { SESSION_ERROR_REASON_HEADER } from '@kbn/security-plugin/common/constants';

const KBN_XSRF = 'xxx';
const KIBANA_PORT = 5620;
const SAML_CALLBACK_URL = `http://localhost:${KIBANA_PORT}/api/security/saml/callback`;
const IDLE_TIMEOUT_MS = 10_000;

function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
  const list = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
    ? [setCookieHeader]
    : [];
  const sidCookie = list.find((c) => c.startsWith('sid='));
  if (!sidCookie) throw new Error('No sid cookie found');
  return sidCookie.split(';')[0];
}

async function waitFor(
  condition: () => Promise<void>,
  timeout = 30000,
  interval = 1000
): Promise<void> {
  const deadline = Date.now() + timeout;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await condition();
      return;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, interval));
    }
  }
  throw lastError;
}

test.describe('Session Idle', { tag: [...tags.stateful.classic] }, () => {
  test.describe('Session expired', () => {
    test.beforeEach(async ({ apiClient, config, esClient }) => {
      await esClient.cluster.health({
        index: '.kibana_security_session*',
        wait_for_status: 'green',
        ignore_unavailable: true,
      } as any);
      await waitFor(
        async () => {
          await clearAllSessions(apiClient, config);
          expect(await getSessionCount(esClient)).toBe(0);
        },
        10000,
        500
      );
    });

    test(`should return ${SESSION_ERROR_REASON_HEADER} header if session is expired`, async ({
      apiClient,
      config,
      esClient,
    }) => {
      test.setTimeout(100000);

      const loginResponse = await apiClient.post('/internal/security/login', {
        headers: { 'kbn-xsrf': KBN_XSRF },
        body: {
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username: config.auth.username, password: config.auth.password },
        },
      });
      expect(loginResponse).toHaveStatusCode(200);

      const cookie = extractSessionCookie(loginResponse.headers['set-cookie'] as string[]);

      await waitFor(
        async () => {
          expect(await getSessionCount(esClient)).toBe(1);
        },
        5000,
        200
      );

      const meResponse = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
      });
      expect(meResponse).toHaveStatusCode(200);

      await new Promise((r) => setTimeout(r, 11000));

      expect(await getSessionCount(esClient)).toBe(1);

      const expiredResponse = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
      });
      expect(expiredResponse).toHaveStatusCode(401);
      const reasonHeader = expiredResponse.headers[SESSION_ERROR_REASON_HEADER];
      expect(reasonHeader).toBe('SESSION_IDLE_TIMEOUT');
    });
  });

  test.describe('Session extension', () => {
    let sessionCookie: string;

    test.beforeEach(async ({ apiClient, config }) => {
      const response = await apiClient.post('/internal/security/login', {
        headers: { 'kbn-xsrf': KBN_XSRF },
        body: {
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username: config.auth.username, password: config.auth.password },
        },
      });
      expect(response).toHaveStatusCode(200);
      sessionCookie = extractSessionCookie(response.headers['set-cookie'] as string[]);
    });

    test.describe('GET /internal/security/session', () => {
      test('should return current session information', async ({ apiClient }) => {
        const response = await apiClient.get('/internal/security/session', {
          headers: { 'kbn-xsrf': KBN_XSRF, 'kbn-system-request': 'true', Cookie: sessionCookie },
        });
        expect(response).toHaveStatusCode(200);
        expect(typeof response.body.expiresInMs).toBe('number');
        expect(response.body.canBeExtended).toBe(true);
        expect(response.body.provider).toStrictEqual({ type: 'basic', name: 'basic1' });
      });

      test('should not extend the session', async ({ apiClient }) => {
        const r1 = await apiClient.get('/internal/security/session', {
          headers: { 'kbn-xsrf': KBN_XSRF, 'kbn-system-request': 'true', Cookie: sessionCookie },
        });
        expect(r1).toHaveStatusCode(200);
        const r2 = await apiClient.get('/internal/security/session', {
          headers: { 'kbn-xsrf': KBN_XSRF, 'kbn-system-request': 'true', Cookie: sessionCookie },
        });
        expect(r2).toHaveStatusCode(200);
        expect(r2.body.expiresInMs).toBeLessThan(r1.body.expiresInMs);
      });
    });

    test.describe('POST /internal/security/session', () => {
      test('should redirect to GET', async ({ apiClient }) => {
        const response = await apiClient.post('/internal/security/session', {
          headers: { 'kbn-xsrf': KBN_XSRF, Cookie: sessionCookie },
        });
        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe('/internal/security/session');
      });

      test('should extend the session', async ({ apiClient, esClient }) => {
        const allCreatedAtBefore = await getSessionsCreatedAt(esClient);
        expect(allCreatedAtBefore.every((v) => v > 0)).toBe(true);

        await new Promise((r) => setTimeout(r, 200));
        await apiClient.get('/internal/security/session', {
          headers: { 'kbn-xsrf': KBN_XSRF, 'kbn-system-request': 'true', Cookie: sessionCookie },
        });

        const extendResponse = await apiClient.post('/internal/security/session', {
          headers: { 'kbn-xsrf': KBN_XSRF, Cookie: sessionCookie },
        });
        expect(extendResponse.statusCode).toBe(302);

        if (extendResponse.headers['set-cookie']) {
          sessionCookie = extractSessionCookie(
            extendResponse.headers['set-cookie'] as string | string[]
          );
        }

        const afterExtend = Date.now();
        const getResponse = await apiClient.get('/internal/security/session', {
          headers: { 'kbn-xsrf': KBN_XSRF, 'kbn-system-request': 'true', Cookie: sessionCookie },
        });
        expect(getResponse).toHaveStatusCode(200);
        const getOverhead = Date.now() - afterExtend;

        expect(getResponse.body.expiresInMs).toBeGreaterThan(IDLE_TIMEOUT_MS - getOverhead - 100);
        expect(getResponse.body.expiresInMs).toBeLessThan(IDLE_TIMEOUT_MS + 100);

        const allCreatedAtAfter = await getSessionsCreatedAt(esClient);
        expect(allCreatedAtAfter).toStrictEqual(allCreatedAtBefore);
      });
    });
  });

  test.describe('Session Idle cleanup', () => {
    test.beforeEach(async ({ apiClient, config, esClient }) => {
      await esClient.cluster.health({
        index: '.kibana_security_session*',
        wait_for_status: 'green',
        ignore_unavailable: true,
      } as any);
      await esClient.cluster.putSettings({
        body: { persistent: { 'logger.org.elasticsearch.xpack.security.authc': 'debug' } },
      } as any);
      await waitFor(
        async () => {
          await clearAllSessions(apiClient, config);
          expect(await getSessionCount(esClient)).toBe(0);
        },
        10000,
        500
      );
    });

    test('should properly clean up session expired because of idle timeout', async ({
      apiClient,
      config,
      esClient,
    }) => {
      test.setTimeout(100000);

      const loginResponse = await apiClient.post('/internal/security/login', {
        headers: { 'kbn-xsrf': KBN_XSRF },
        body: {
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username: config.auth.username, password: config.auth.password },
        },
      });
      expect(loginResponse).toHaveStatusCode(200);
      const cookie = extractSessionCookie(loginResponse.headers['set-cookie'] as string[]);

      const meResponse = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
      });
      expect(meResponse.body.username).toBe(config.auth.username);
      await waitFor(
        async () => {
          expect(await getSessionCount(esClient)).toBe(1);
        },
        5000,
        200
      );

      await runCleanupTask(apiClient, config.auth.username, config.auth.password);

      await new Promise((r) => setTimeout(r, 40000));

      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(0);
      }, 20000);

      const expiredResponse = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
      });
      expect(expiredResponse).toHaveStatusCode(401);
    });

    test('should properly clean up session expired because of idle timeout when providers override global session config', async ({
      apiClient,
      config,
      esClient,
    }) => {
      test.setTimeout(100000);

      const samlDisableCookie = await loginWithSAML(apiClient, 'saml_disable');
      const samlOverrideCookie = await loginWithSAML(apiClient, 'saml_override');
      const samlFallbackCookie = await loginWithSAML(apiClient, 'saml_fallback');

      const basicResponse = await apiClient.post('/internal/security/login', {
        headers: { 'kbn-xsrf': KBN_XSRF },
        body: {
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username: config.auth.username, password: config.auth.password },
        },
      });
      expect(basicResponse).toHaveStatusCode(200);
      const basicCookie = extractSessionCookie(basicResponse.headers['set-cookie'] as string[]);

      const meBasic = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
      });
      expect(meBasic.body.username).toBe(config.auth.username);
      await waitFor(
        async () => {
          expect(await getSessionCount(esClient)).toBe(4);
        },
        5000,
        200
      );

      await runCleanupTask(apiClient, config.auth.username, config.auth.password);

      await new Promise((r) => setTimeout(r, 40000));

      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(2);
      }, 20000);

      const basicExpired = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
      });
      expect(basicExpired).toHaveStatusCode(401);

      const fallbackExpired = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlFallbackCookie },
      });
      expect(fallbackExpired).toHaveStatusCode(401);

      const overrideMe = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlOverrideCookie },
      });
      expect(overrideMe).toHaveStatusCode(200);
      expect(overrideMe.body.authentication_provider).toStrictEqual({
        type: 'saml',
        name: 'saml_override',
      });

      const disableMe = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlDisableCookie },
      });
      expect(disableMe).toHaveStatusCode(200);
      expect(disableMe.body.authentication_provider).toStrictEqual({
        type: 'saml',
        name: 'saml_disable',
      });
    });

    test('should not clean up session if user is active', async ({
      apiClient,
      config,
      esClient,
    }) => {
      test.setTimeout(100000);

      const loginResponse = await apiClient.post('/internal/security/login', {
        headers: { 'kbn-xsrf': KBN_XSRF },
        body: {
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username: config.auth.username, password: config.auth.password },
        },
      });
      expect(loginResponse).toHaveStatusCode(200);
      let cookie = extractSessionCookie(loginResponse.headers['set-cookie'] as string[]);

      const me0 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
      });
      expect(me0.body.username).toBe(config.auth.username);
      await waitFor(
        async () => {
          expect(await getSessionCount(esClient)).toBe(1);
        },
        5000,
        200
      );

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const meResponse = await apiClient.get('/internal/security/me', {
          headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
        });
        expect(meResponse).toHaveStatusCode(200);
        if (meResponse.headers['set-cookie']) {
          cookie = extractSessionCookie(meResponse.headers['set-cookie'] as string | string[]);
        }
      }

      expect(await getSessionCount(esClient)).toBe(1);
    });
  });
});

async function clearAllSessions(
  apiClient: any,
  config: { auth: { username: string; password: string } }
): Promise<void> {
  const adminBase64 = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString(
    'base64'
  );
  await apiClient
    .post('/api/security/session/_invalidate', {
      headers: { 'kbn-xsrf': KBN_XSRF, Authorization: `Basic ${adminBase64}` },
      body: { match: 'all' },
    })
    .catch(() => {});
}

async function getSessionCount(esClient: any): Promise<number> {
  await esClient.indices
    .refresh({ index: '.kibana_security_session*', ignore_unavailable: true })
    .catch(() => {});
  const result = await esClient.search({
    index: '.kibana_security_session*',
    ignore_unavailable: true,
  });
  return (result.hits.total as { value: number }).value;
}

async function getSessionsCreatedAt(esClient: any): Promise<number[]> {
  await esClient.indices
    .refresh({ index: '.kibana_security_session*', ignore_unavailable: true })
    .catch(() => {});
  const result = await esClient.search({
    index: '.kibana_security_session*',
    ignore_unavailable: true,
  });
  return result.hits.hits.map((h: any) => h._source!.createdAt).sort();
}

async function loginWithSAML(apiClient: any, providerName: string): Promise<string> {
  const handshakeResponse = await apiClient.post('/internal/security/login', {
    headers: { 'kbn-xsrf': KBN_XSRF },
    body: { providerType: 'saml', providerName, currentURL: '' },
  });
  if (handshakeResponse.statusCode !== 200) {
    throw new Error(`SAML handshake failed: ${handshakeResponse.statusCode}`);
  }
  const handshakeCookie = extractSessionCookie(
    handshakeResponse.headers['set-cookie'] as string | string[]
  );

  const samlResponse = await getSAMLResponse({
    destination: SAML_CALLBACK_URL,
    sessionIndex: String(Math.floor(Math.random() * 1000000)),
    inResponseTo: await getSAMLRequestId(handshakeResponse.body.location),
  });

  const authResponse = await apiClient.post('/api/security/saml/callback', {
    headers: { 'kbn-xsrf': KBN_XSRF, Cookie: handshakeCookie },
    body: { SAMLResponse: samlResponse },
  });
  if (authResponse.statusCode !== 302) {
    throw new Error(`SAML callback failed: ${authResponse.statusCode}`);
  }
  return extractSessionCookie(authResponse.headers['set-cookie'] as string | string[]);
}

async function runCleanupTask(apiClient: any, username: string, password: string): Promise<void> {
  const authBase64 = Buffer.from(`${username}:${password}`).toString('base64');
  await apiClient.post('/session/_run_cleanup', {
    headers: { 'kbn-xsrf': KBN_XSRF, Authorization: `Basic ${authBase64}` },
  });
}
