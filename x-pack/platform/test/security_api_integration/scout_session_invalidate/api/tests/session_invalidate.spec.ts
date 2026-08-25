/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  getSAMLRequestId,
  getSAMLResponse,
} from '@kbn/security-api-integration-helpers/saml/saml_tools';

const KBN_XSRF = 'xxx';
const KIBANA_PORT = 5620;
const SAML_CALLBACK_URL = `http://localhost:${KIBANA_PORT}/api/security/saml/callback`;
const TEST_USERNAME = 'invalidate_test_user';
const TEST_PASSWORD = 'changeme';

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

async function loginWithSAML(apiClient: any): Promise<string> {
  const handshakeResponse = await apiClient.post('/internal/security/login', {
    headers: { 'kbn-xsrf': KBN_XSRF },
    body: { providerType: 'saml', providerName: 'saml1', currentURL: '' },
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
  const cookie = extractSessionCookie(authResponse.headers['set-cookie'] as string | string[]);

  const meResponse = await apiClient.get('/internal/security/me', {
    headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
  });
  expect(meResponse.body.username).toBe('a@b.c');
  return cookie;
}

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

async function loginWithBasic(
  apiClient: any,
  username: string,
  password: string
): Promise<string> {
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
  const cookie = extractSessionCookie(response.headers['set-cookie'] as string[]);
  const meResponse = await apiClient.get('/internal/security/me', {
    headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
  });
  expect(meResponse.body.username).toBe(username);
  return cookie;
}

test.describe('Session Invalidate', { tag: [...tags.stateful.classic] }, () => {
  test.beforeAll(async ({ esClient }) => {
    await esClient.security.putUser({
      username: TEST_USERNAME,
      body: { password: TEST_PASSWORD, roles: ['kibana_admin'], full_name: 'Invalidate Test User' },
    } as any);
  });

  test.afterAll(async ({ esClient }) => {
    await esClient.security.deleteUser({ username: TEST_USERNAME } as any).catch(() => {});
  });

  test.beforeEach(async ({ apiClient, config, esClient }) => {
    await esClient.cluster.health({
      index: '.kibana_security_session*',
      wait_for_status: 'green',
      ignore_unavailable: true,
    } as any);
    await esClient.cluster.putSettings({
      body: { persistent: { 'logger.org.elasticsearch.xpack.security.authc': 'debug' } },
    } as any);
    await clearAllSessions(apiClient, config);

    // Ensure test user has kibana_admin role (reset between tests)
    await esClient.security.putUser({
      username: TEST_USERNAME,
      body: { password: TEST_PASSWORD, roles: ['kibana_admin'], full_name: 'Invalidate Test User' },
    } as any);
  });

  function adminAuth(config: { auth: { username: string; password: string } }) {
    const b64 = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString('base64');
    return { Authorization: `Basic ${b64}`, 'kbn-xsrf': KBN_XSRF };
  }

  test('should be able to invalidate all sessions at once', async ({ apiClient, config }) => {
    const basicCookie = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const samlCookie = await loginWithSAML(apiClient);

    const invalidateResponse = await apiClient.post('/api/security/session/_invalidate', {
      headers: adminAuth(config),
      body: { match: 'all' },
    });
    expect(invalidateResponse).toHaveStatusCode(200);
    expect(invalidateResponse.body.total).toBe(2);

    const basicExpired = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
    });
    expect(basicExpired).toHaveStatusCode(401);

    const samlExpired = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookie },
    });
    expect(samlExpired).toHaveStatusCode(401);
  });

  test('should do nothing if specified provider type is not configured', async ({
    apiClient,
    config,
  }) => {
    const basicCookie = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const samlCookie = await loginWithSAML(apiClient);

    const noopResponse = await apiClient.post('/api/security/session/_invalidate', {
      headers: adminAuth(config),
      body: { match: 'query', query: { provider: { type: 'oidc' } } },
    });
    expect(noopResponse).toHaveStatusCode(200);
    expect(noopResponse.body.total).toBe(0);

    const basicOk = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
    });
    expect(basicOk.body.username).toBe(TEST_USERNAME);

    const samlOk = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookie },
    });
    expect(samlOk.body.username).toBe('a@b.c');
  });

  test('should be able to invalidate session only for a specific provider type', async ({
    apiClient,
    config,
  }) => {
    const basicCookie = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const samlCookie = await loginWithSAML(apiClient);

    const invalidateBasic = await apiClient.post('/api/security/session/_invalidate', {
      headers: adminAuth(config),
      body: { match: 'query', query: { provider: { type: 'basic' } } },
    });
    expect(invalidateBasic).toHaveStatusCode(200);
    expect(invalidateBasic.body.total).toBe(1);

    const basicExpired = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
    });
    expect(basicExpired).toHaveStatusCode(401);

    const samlOk = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookie },
    });
    expect(samlOk.body.username).toBe('a@b.c');

    const invalidateSaml = await apiClient.post('/api/security/session/_invalidate', {
      headers: adminAuth(config),
      body: { match: 'query', query: { provider: { type: 'saml' } } },
    });
    expect(invalidateSaml).toHaveStatusCode(200);
    expect(invalidateSaml.body.total).toBe(1);

    const samlExpired = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookie },
    });
    expect(samlExpired).toHaveStatusCode(401);
  });

  test('should do nothing if specified provider name is not configured', async ({
    apiClient,
    config,
  }) => {
    const basicCookie = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const samlCookie = await loginWithSAML(apiClient);

    const noop1 = await apiClient.post('/api/security/session/_invalidate', {
      headers: adminAuth(config),
      body: { match: 'query', query: { provider: { type: 'basic', name: 'basic2' } } },
    });
    expect(noop1).toHaveStatusCode(200);
    expect(noop1.body.total).toBe(0);

    const noop2 = await apiClient.post('/api/security/session/_invalidate', {
      headers: adminAuth(config),
      body: { match: 'query', query: { provider: { type: 'saml', name: 'saml2' } } },
    });
    expect(noop2).toHaveStatusCode(200);
    expect(noop2.body.total).toBe(0);

    const basicOk = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
    });
    expect(basicOk.body.username).toBe(TEST_USERNAME);

    const samlOk = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookie },
    });
    expect(samlOk.body.username).toBe('a@b.c');
  });

  test('should be able to invalidate session only for a specific provider name', async ({
    apiClient,
    config,
  }) => {
    const basicCookie = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const samlCookie = await loginWithSAML(apiClient);

    const invalidateSaml1 = await apiClient.post('/api/security/session/_invalidate', {
      headers: adminAuth(config),
      body: { match: 'query', query: { provider: { type: 'saml', name: 'saml1' } } },
    });
    expect(invalidateSaml1).toHaveStatusCode(200);
    expect(invalidateSaml1.body.total).toBe(1);

    const basicOk = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
    });
    expect(basicOk.body.username).toBe(TEST_USERNAME);

    const samlExpired = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookie },
    });
    expect(samlExpired).toHaveStatusCode(401);

    const invalidateBasic1 = await apiClient.post('/api/security/session/_invalidate', {
      headers: adminAuth(config),
      body: { match: 'query', query: { provider: { type: 'basic', name: 'basic1' } } },
    });
    expect(invalidateBasic1).toHaveStatusCode(200);
    expect(invalidateBasic1.body.total).toBe(1);

    const basicExpired = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
    });
    expect(basicExpired).toHaveStatusCode(401);
  });

  test('should do nothing if specified username does not have session', async ({
    apiClient,
    config,
  }) => {
    const basicCookie = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const samlCookie = await loginWithSAML(apiClient);

    const noop1 = await apiClient.post('/api/security/session/_invalidate', {
      headers: adminAuth(config),
      body: {
        match: 'query',
        query: { provider: { type: 'basic', name: 'basic1' }, username: `_${TEST_USERNAME}` },
      },
    });
    expect(noop1).toHaveStatusCode(200);
    expect(noop1.body.total).toBe(0);

    const noop2 = await apiClient.post('/api/security/session/_invalidate', {
      headers: adminAuth(config),
      body: {
        match: 'query',
        query: { provider: { type: 'saml', name: 'saml1' }, username: '_a@b.c' },
      },
    });
    expect(noop2).toHaveStatusCode(200);
    expect(noop2.body.total).toBe(0);

    const basicOk = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
    });
    expect(basicOk.body.username).toBe(TEST_USERNAME);

    const samlOk = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookie },
    });
    expect(samlOk.body.username).toBe('a@b.c');
  });

  test('should be able to invalidate session only for a specific user', async ({
    apiClient,
    config,
  }) => {
    const basicCookie = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
    const samlCookie = await loginWithSAML(apiClient);

    const invalidateBasicUser = await apiClient.post('/api/security/session/_invalidate', {
      headers: adminAuth(config),
      body: {
        match: 'query',
        query: { provider: { type: 'basic', name: 'basic1' }, username: TEST_USERNAME },
      },
    });
    expect(invalidateBasicUser).toHaveStatusCode(200);
    expect(invalidateBasicUser.body.total).toBe(1);

    const basicExpired = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
    });
    expect(basicExpired).toHaveStatusCode(401);

    const samlOk = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookie },
    });
    expect(samlOk.body.username).toBe('a@b.c');

    const invalidateSamlUser = await apiClient.post('/api/security/session/_invalidate', {
      headers: adminAuth(config),
      body: {
        match: 'query',
        query: { provider: { type: 'saml', name: 'saml1' }, username: 'a@b.c' },
      },
    });
    expect(invalidateSamlUser).toHaveStatusCode(200);
    expect(invalidateSamlUser.body.total).toBe(1);

    const samlExpired = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookie },
    });
    expect(samlExpired).toHaveStatusCode(401);
  });

  test.describe('only super users', () => {
    test('should be able to invalidate sessions', async ({ apiClient, esClient }) => {
      // Skip in FIPS mode — test_user is not a super user by default and FIPS prevents certain role assignments
      const isFips = process.env.TEST_FIPS_MODE === '1';
      test.skip(isFips, 'Skipped in FIPS mode');

      const basicCookie = await loginWithBasic(apiClient, TEST_USERNAME, TEST_PASSWORD);
      const samlCookie = await loginWithSAML(apiClient);

      const testUserAuth = Buffer.from(`${TEST_USERNAME}:${TEST_PASSWORD}`).toString('base64');
      const testAuthHeaders = {
        Authorization: `Basic ${testUserAuth}`,
        'kbn-xsrf': KBN_XSRF,
      };

      // Non-superuser should get 403
      const forbidden1 = await apiClient.post('/api/security/session/_invalidate', {
        headers: testAuthHeaders,
        body: { match: 'all' },
      });
      expect(forbidden1).toHaveStatusCode(403);

      const forbidden2 = await apiClient.post('/api/security/session/_invalidate', {
        headers: testAuthHeaders,
        body: { match: 'query', query: { provider: { type: 'basic' } } },
      });
      expect(forbidden2).toHaveStatusCode(403);

      const forbidden3 = await apiClient.post('/api/security/session/_invalidate', {
        headers: testAuthHeaders,
        body: {
          match: 'query',
          query: { provider: { type: 'basic' }, username: TEST_USERNAME },
        },
      });
      expect(forbidden3).toHaveStatusCode(403);

      // Both sessions should still be valid
      const basicOk = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
      });
      expect(basicOk.body.username).toBe(TEST_USERNAME);
      const samlOk = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookie },
      });
      expect(samlOk.body.username).toBe('a@b.c');

      // Give test user superuser role
      await esClient.security.putUser({
        username: TEST_USERNAME,
        body: { password: TEST_PASSWORD, roles: ['superuser'] },
      } as any);

      // Now invalidation should succeed
      const success = await apiClient.post('/api/security/session/_invalidate', {
        headers: testAuthHeaders,
        body: { match: 'all' },
      });
      expect(success).toHaveStatusCode(200);
      expect(success.body.total).toBe(2);

      const basicExpired = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
      });
      expect(basicExpired).toHaveStatusCode(401);

      const samlExpired = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: samlCookie },
      });
      expect(samlExpired).toHaveStatusCode(401);
    });
  });
});
