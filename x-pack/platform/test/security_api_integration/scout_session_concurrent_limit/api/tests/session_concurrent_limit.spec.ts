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

const KBN_XSRF = 'xxx';
const KIBANA_PORT = 5620;
const SAML_CALLBACK_URL = `http://localhost:${KIBANA_PORT}/api/security/saml/callback`;
const TEST_USERNAME = 'concurrent_test_user';
const TEST_PASSWORD = 'changeme';
const ANONYMOUS_USERNAME = 'anonymous_user';
const ANONYMOUS_PASSWORD = 'changeme';

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

async function getSessionCount(esClient: any): Promise<number> {
  await esClient.indices
    .refresh(
      { index: '.kibana_security_session*', ignore_unavailable: true } as any,
      { headers: { 'x-elastic-product-origin': 'kibana' } } as any
    )
    .catch(() => {});
  const result = await esClient.search({
    index: '.kibana_security_session*',
    ignore_unavailable: true,
  });
  return (result.hits.total as { value: number }).value;
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

async function loginWithBasic(apiClient: any, username: string, password: string): Promise<string> {
  const response = await apiClient.post('/internal/security/login', {
    headers: { 'kbn-xsrf': KBN_XSRF },
    body: {
      providerType: 'basic',
      providerName: 'basic1',
      currentURL: '/',
      params: { username, password },
    },
  });
  expect(response).toHaveStatusCode(200);
  return extractSessionCookie(response.headers['set-cookie'] as string[]);
}

async function startSAMLHandshake(apiClient: any): Promise<{ cookie: string; location: string }> {
  const handshakeResponse = await apiClient.post('/internal/security/login', {
    headers: { 'kbn-xsrf': KBN_XSRF },
    body: { providerType: 'saml', providerName: 'saml1', currentURL: '' },
  });
  expect(handshakeResponse).toHaveStatusCode(200);
  return {
    cookie: extractSessionCookie(handshakeResponse.headers['set-cookie'] as string | string[]),
    location: handshakeResponse.body.location,
  };
}

async function finishSAMLHandshake(
  apiClient: any,
  handshakeCookie: string,
  handshakeLocation: string
): Promise<string> {
  const samlResponse = await getSAMLResponse({
    destination: SAML_CALLBACK_URL,
    sessionIndex: String(Math.floor(Math.random() * 1000000)),
    inResponseTo: await getSAMLRequestId(handshakeLocation),
  });

  const authResponse = await apiClient.post('/api/security/saml/callback', {
    headers: { 'kbn-xsrf': KBN_XSRF, Cookie: handshakeCookie },
    body: { SAMLResponse: samlResponse },
  });
  expect(authResponse.statusCode).toBe(302);
  return extractSessionCookie(authResponse.headers['set-cookie'] as string | string[]);
}

async function loginWithSAML(apiClient: any): Promise<string> {
  const { cookie, location } = await startSAMLHandshake(apiClient);
  return finishSAMLHandshake(apiClient, cookie, location);
}

async function loginWithAnonymous(apiClient: any): Promise<string> {
  const response = await apiClient.post('/internal/security/login', {
    headers: { 'kbn-xsrf': KBN_XSRF },
    body: { providerType: 'anonymous', providerName: 'anonymous1', currentURL: '/' },
  });
  expect(response).toHaveStatusCode(200);
  return extractSessionCookie(response.headers['set-cookie'] as string[]);
}

async function refreshSessionIndex(
  apiClient: any,
  config: { auth: { username: string; password: string } }
): Promise<void> {
  const authBase64 = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString(
    'base64'
  );
  await apiClient.post('/session/_refresh_session_index', {
    headers: { 'kbn-xsrf': KBN_XSRF, Authorization: `Basic ${authBase64}` },
  });
}

async function runCleanupTask(
  apiClient: any,
  config: { auth: { username: string; password: string } }
): Promise<void> {
  const authBase64 = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString(
    'base64'
  );
  await waitFor(async () => {
    const response = await apiClient.post('/session/_run_cleanup', {
      headers: { 'kbn-xsrf': KBN_XSRF, Authorization: `Basic ${authBase64}` },
    });
    expect(response).toHaveStatusCode(200);
  }, 30000);
}

async function toggleSessionCleanupTask(
  apiClient: any,
  config: { auth: { username: string; password: string } },
  enabled: boolean
): Promise<void> {
  const authBase64 = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString(
    'base64'
  );
  const response = await apiClient.post('/session/toggle_cleanup_task', {
    headers: { 'kbn-xsrf': KBN_XSRF, Authorization: `Basic ${authBase64}` },
    body: { enabled },
  });
  expect(response).toHaveStatusCode(200);
}

async function invalidateAllSessions(
  apiClient: any,
  config: { auth: { username: string; password: string } }
): Promise<void> {
  const authBase64 = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString(
    'base64'
  );
  await apiClient.post('/api/security/session/_invalidate', {
    headers: { 'kbn-xsrf': KBN_XSRF, Authorization: `Basic ${authBase64}` },
    body: { match: 'all' },
  });
}

test.describe('Session Concurrent Limit', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.security.putUser({
      username: TEST_USERNAME,
      body: { password: TEST_PASSWORD, roles: ['kibana_admin'], full_name: 'Concurrent Test User' },
    } as any);
    await esClient.security.putUser({
      username: ANONYMOUS_USERNAME,
      body: { password: ANONYMOUS_PASSWORD, roles: [], full_name: 'Guest' },
    } as any);
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.security.deleteUser({ username: TEST_USERNAME } as any).catch(() => {});
    await esClient.security.deleteUser({ username: ANONYMOUS_USERNAME } as any).catch(() => {});
  });

  test.describe('Cleanup', () => {
    test.beforeEach(async ({ apiClient, config, esClient }) => {
      await esClient.cluster.health({
        index: '.kibana_security_session*',
        wait_for_status: 'green',
        ignore_unavailable: true,
      } as any);
      await esClient.cluster.putSettings({
        body: { persistent: { 'logger.org.elasticsearch.xpack.security.authc': 'debug' } },
      } as any);
      await invalidateAllSessions(apiClient, config);
    });

    test('should properly clean up sessions that exceeded concurrent session limit', async ({
      apiClient,
      config,
      esClient,
    }) => {
      test.setTimeout(100000);

      const cookieOne = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await new Promise((r) => setTimeout(r, 500));
      const cookieTwo = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await new Promise((r) => setTimeout(r, 500));
      const cookieThree = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);

      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(3);
      }, 20000);

      await runCleanupTask(apiClient, config);

      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(2);
      }, 30000);

      const r1 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieOne },
      });
      expect(r1).toHaveStatusCode(401);

      const r2 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieTwo },
      });
      expect(r2.body.username).toBe(TEST_USERNAME);

      const r3 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieThree },
      });
      expect(r3.body.username).toBe(TEST_USERNAME);
    });

    test('should properly clean up sessions that exceeded concurrent session limit even for multiple providers', async ({
      apiClient,
      config,
      esClient,
    }) => {
      test.setTimeout(160000);

      const basicCookieOne = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(1);
      }, 20000);

      const samlCookieOne = await loginWithSAML(apiClient);
      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(2);
      }, 20000);

      const basicCookieTwo = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(3);
      }, 20000);

      const samlCookieTwo = await loginWithSAML(apiClient);
      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(4);
      }, 20000);

      const basicCookieThree = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(5);
      }, 20000);

      const samlCookieThree = await loginWithSAML(apiClient);
      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(6);
      }, 20000);

      await runCleanupTask(apiClient, config);

      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(4);
      }, 30000);

      const b1 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieOne },
      });
      expect(b1).toHaveStatusCode(401);

      const b2 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieTwo },
      });
      expect(b2.body.username).toBe(TEST_USERNAME);

      const b3 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieThree },
      });
      expect(b3.body.username).toBe(TEST_USERNAME);

      const s1 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieOne },
      });
      expect(s1).toHaveStatusCode(401);

      const s2 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieTwo },
      });
      expect(s2.body.username).toBe('a@b.c');

      const s3 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieThree },
      });
      expect(s3.body.username).toBe('a@b.c');
    });

    test('should properly clean up sessions that exceeded concurrent session limit when legacy sessions are present', async ({
      apiClient,
      config,
      esClient,
    }) => {
      test.setTimeout(100000);

      const basicCookieOne = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(1);
      }, 20000);

      const samlCookieOne = await loginWithSAML(apiClient);
      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(2);
      }, 20000);

      const basicCookieTwo = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(3);
      }, 20000);

      const samlCookieTwo = await loginWithSAML(apiClient);
      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(4);
      }, 20000);

      const basicCookieThree = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(5);
      }, 20000);

      const samlCookieThree = await loginWithSAML(apiClient);
      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(6);
      }, 20000);

      // Remove `createdAt` from the latest sessions to emulate legacy sessions
      const aggResponse = await esClient.search({
        index: '.kibana_security_session*',
        size: 0,
        filter_path: 'aggregations.sessions.buckets.top.hits.hits._id',
        aggs: {
          sessions: {
            multi_terms: { terms: [{ field: 'usernameHash' }, { field: 'provider.type' }] },
            aggs: { top: { top_hits: { sort: [{ createdAt: { order: 'desc' } }], size: 1 } } },
          },
        },
      } as any);

      const sessionIds: string[] = (
        (aggResponse.aggregations as any)?.sessions?.buckets ?? []
      ).flatMap((bucket: any) => {
        const id = bucket.top?.hits?.hits?.[0]?._id;
        return id ? [id] : [];
      });
      expect(sessionIds.length).toBe(2);

      const authBase64 = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString(
        'base64'
      );
      await apiClient.post('/session/_remove_created_at', {
        body: { ids: sessionIds },
        headers: { 'kbn-xsrf': KBN_XSRF, Authorization: `Basic ${authBase64}` },
      });

      await runCleanupTask(apiClient, config);

      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(4);
      }, 30000);

      // Legacy sessions (newest, with createdAt removed) are kept; oldest real sessions removed
      const b1 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieOne },
      });
      expect(b1.body.username).toBe(TEST_USERNAME);

      const b2 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieTwo },
      });
      expect(b2.body.username).toBe(TEST_USERNAME);

      const b3 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieThree },
      });
      expect(b3).toHaveStatusCode(401);

      const s1 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieOne },
      });
      expect(s1.body.username).toBe('a@b.c');

      const s2 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieTwo },
      });
      expect(s2.body.username).toBe('a@b.c');

      const s3 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieThree },
      });
      expect(s3).toHaveStatusCode(401);
    });

    test('should not clean up session if the limit is not exceeded', async ({
      apiClient,
      config,
      esClient,
    }) => {
      test.setTimeout(100000);

      const cookieOne = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await new Promise((r) => setTimeout(r, 500));
      const cookieTwo = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);

      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(2);
      }, 20000);

      await runCleanupTask(apiClient, config);

      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(2);
      }, 30000);

      const r1 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieOne },
      });
      expect(r1.body.username).toBe(TEST_USERNAME);

      const r2 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieTwo },
      });
      expect(r2.body.username).toBe(TEST_USERNAME);
    });

    test('should not clean up sessions of the anonymous users', async ({
      apiClient,
      config,
      esClient,
    }) => {
      test.setTimeout(100000);

      const cookieOne = await loginWithAnonymous(apiClient);
      const cookieTwo = await loginWithAnonymous(apiClient);
      const cookieThree = await loginWithAnonymous(apiClient);

      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(3);
      }, 20000);

      await runCleanupTask(apiClient, config);

      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(3);
      }, 30000);

      for (const cookie of [cookieOne, cookieTwo, cookieThree]) {
        const r = await apiClient.get('/internal/security/me', {
          headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
        });
        expect(r.body.username).toBe(ANONYMOUS_USERNAME);
      }
    });

    test('should not clean up unauthenticated sessions', async ({
      apiClient,
      config,
      esClient,
    }) => {
      test.setTimeout(100000);

      const handshakeOne = await startSAMLHandshake(apiClient);
      await new Promise((r) => setTimeout(r, 500));
      const handshakeTwo = await startSAMLHandshake(apiClient);
      await new Promise((r) => setTimeout(r, 500));
      const handshakeThree = await startSAMLHandshake(apiClient);
      await new Promise((r) => setTimeout(r, 500));

      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(3);
      }, 20000);

      await runCleanupTask(apiClient, config);

      await waitFor(async () => {
        expect(await getSessionCount(esClient)).toBe(3);
      }, 30000);

      // Finish all SAML handshakes — limit only enforced at session creation, not during handshake
      const samlCookieOne = await finishSAMLHandshake(
        apiClient,
        handshakeOne.cookie,
        handshakeOne.location
      );
      await new Promise((r) => setTimeout(r, 500));
      const samlCookieTwo = await finishSAMLHandshake(
        apiClient,
        handshakeTwo.cookie,
        handshakeTwo.location
      );
      await new Promise((r) => setTimeout(r, 500));
      const samlCookieThree = await finishSAMLHandshake(
        apiClient,
        handshakeThree.cookie,
        handshakeThree.location
      );

      await refreshSessionIndex(apiClient, config);

      const s1 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieOne },
      });
      expect(s1).toHaveStatusCode(401);

      const s2 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieTwo },
      });
      expect(s2.body.username).toBe('a@b.c');

      const s3 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieThree },
      });
      expect(s3.body.username).toBe('a@b.c');
    });
  });

  test.describe('Global Limit', () => {
    test.beforeAll(async ({ apiClient, config }) => {
      await toggleSessionCleanupTask(apiClient, config, false);
    });

    test.afterAll(async ({ apiClient, config }) => {
      await toggleSessionCleanupTask(apiClient, config, true);
    });

    test.beforeEach(async ({ apiClient, config, esClient }) => {
      await refreshSessionIndex(apiClient, config);
      await esClient.cluster.health({
        index: '.kibana_security_session*',
        wait_for_status: 'green',
        ignore_unavailable: true,
      } as any);
      await esClient.cluster.putSettings({
        body: { persistent: { 'logger.org.elasticsearch.xpack.security.authc': 'debug' } },
      } as any);
      await invalidateAllSessions(apiClient, config);
    });

    test('should properly enforce session limit with single provider', async ({
      apiClient,
      config,
      esClient,
    }) => {
      const cookieOne = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      const meOne = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieOne },
      });
      expect(meOne.body.username).toBe(TEST_USERNAME);

      const cookieTwo = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      const me1a = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieOne },
      });
      expect(me1a.body.username).toBe(TEST_USERNAME);
      const me2a = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieTwo },
      });
      expect(me2a.body.username).toBe(TEST_USERNAME);

      // Third login should displace the oldest
      const cookieThree = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await refreshSessionIndex(apiClient, config);
      const ex1 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieOne },
      });
      expect(ex1).toHaveStatusCode(401);
      const ok2 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieTwo },
      });
      expect(ok2.body.username).toBe(TEST_USERNAME);
      const ok3 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieThree },
      });
      expect(ok3.body.username).toBe(TEST_USERNAME);

      // Fourth login should displace the next oldest
      const cookieFour = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await refreshSessionIndex(apiClient, config);
      const ex2 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieTwo },
      });
      expect(ex2).toHaveStatusCode(401);
      const ok3b = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieThree },
      });
      expect(ok3b.body.username).toBe(TEST_USERNAME);
      const ok4 = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookieFour },
      });
      expect(ok4.body.username).toBe(TEST_USERNAME);
    });

    test('should properly enforce session limit with single provider and multiple users', async ({
      apiClient,
      config,
      esClient,
    }) => {
      const c1 = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      const c2 = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      const c3 = await loginWithBasic(apiClient, config.auth.username, config.auth.password);
      const c4 = await loginWithBasic(apiClient, config.auth.username, config.auth.password);

      // All 4 active
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c1 },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c2 },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c3 },
          })
        ).body.username
      ).toBe(config.auth.username);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c4 },
          })
        ).body.username
      ).toBe(config.auth.username);

      // 5th login as admin displaces oldest admin session
      const c5 = await loginWithBasic(apiClient, config.auth.username, config.auth.password);
      await refreshSessionIndex(apiClient, config);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c1 },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c2 },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        await apiClient.get('/internal/security/me', {
          headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c3 },
        })
      ).toHaveStatusCode(401);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c4 },
          })
        ).body.username
      ).toBe(config.auth.username);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c5 },
          })
        ).body.username
      ).toBe(config.auth.username);

      // 6th login as admin displaces next admin session
      const c6 = await loginWithBasic(apiClient, config.auth.username, config.auth.password);
      await refreshSessionIndex(apiClient, config);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c1 },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c2 },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        await apiClient.get('/internal/security/me', {
          headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c4 },
        })
      ).toHaveStatusCode(401);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c5 },
          })
        ).body.username
      ).toBe(config.auth.username);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c6 },
          })
        ).body.username
      ).toBe(config.auth.username);

      // 7th login as test user displaces oldest test user session
      const c7 = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await refreshSessionIndex(apiClient, config);
      expect(
        await apiClient.get('/internal/security/me', {
          headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c1 },
        })
      ).toHaveStatusCode(401);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c2 },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c5 },
          })
        ).body.username
      ).toBe(config.auth.username);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c6 },
          })
        ).body.username
      ).toBe(config.auth.username);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: c7 },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
    });

    test('should properly enforce session limit even for multiple concurrent logins', async ({
      apiClient,
      config,
    }) => {
      const cookies = await Promise.all(
        Array.from({ length: 10 }).map(() =>
          loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD)
        )
      );

      const statusCodes: number[] = [];
      for (const cookie of cookies) {
        await refreshSessionIndex(apiClient, config);
        const r = await apiClient.get('/internal/security/me', {
          headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
        });
        statusCodes.push(r.statusCode);
      }

      expect(statusCodes.filter((s) => s === 200)).toHaveLength(2);
      expect(statusCodes.filter((s) => s === 401)).toHaveLength(8);
    });

    test('should properly enforce session limit with multiple providers', async ({
      apiClient,
      config,
      esClient,
    }) => {
      const basicCookieOne = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      const basicCookieTwo = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      const samlCookieOne = await loginWithSAML(apiClient);
      const samlCookieTwo = await loginWithSAML(apiClient);

      await refreshSessionIndex(apiClient, config);

      // All active
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieOne },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieTwo },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieOne },
          })
        ).body.username
      ).toBe('a@b.c');
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieTwo },
          })
        ).body.username
      ).toBe('a@b.c');

      // SAML exceeds limit, basic unaffected
      const samlCookieThree = await loginWithSAML(apiClient);
      await refreshSessionIndex(apiClient, config);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieOne },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieTwo },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        await apiClient.get('/internal/security/me', {
          headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieOne },
        })
      ).toHaveStatusCode(401);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieTwo },
          })
        ).body.username
      ).toBe('a@b.c');
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieThree },
          })
        ).body.username
      ).toBe('a@b.c');

      // Basic exceeds limit, SAML unaffected
      const basicCookieThree = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      await refreshSessionIndex(apiClient, config);
      expect(
        await apiClient.get('/internal/security/me', {
          headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieOne },
        })
      ).toHaveStatusCode(401);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieTwo },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookieThree },
          })
        ).body.username
      ).toBe(TEST_USERNAME);
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieTwo },
          })
        ).body.username
      ).toBe('a@b.c');
      expect(
        (
          await apiClient.get('/internal/security/me', {
            headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookieThree },
          })
        ).body.username
      ).toBe('a@b.c');
    });

    test('should not enforce session limit for anonymous users', async ({ apiClient, config }) => {
      for (const _ of [0, 1, 2, 3]) {
        const cookie = await loginWithAnonymous(apiClient);
        await refreshSessionIndex(apiClient, config);
        const r = await apiClient.get('/internal/security/me', {
          headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
        });
        expect(r.body.username).toBe(ANONYMOUS_USERNAME);
      }
    });
  });
});
