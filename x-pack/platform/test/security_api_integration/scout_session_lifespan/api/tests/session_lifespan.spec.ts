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

test.describe('Session Lifespan cleanup', { tag: [...tags.stateful.classic] }, () => {
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

  test('should properly clean up session expired because of lifespan', async ({
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

    // Cleanup routine runs every 20s, wait 60s for lifespan (10s) to be exceeded and cleaned up
    await new Promise((r) => setTimeout(r, 60000));

    expect(await getSessionCount(esClient)).toBe(0);
    const expiredResponse = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
    });
    expect(expiredResponse).toHaveStatusCode(401);
  });

  test('should properly clean up session expired because of lifespan when providers override global session config', async ({
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
    await esClient.indices.refresh({
      index: '.kibana_security_session*',
      ignore_unavailable: true,
    } as any);
    const basicCookie = extractSessionCookie(basicResponse.headers['set-cookie'] as string[]);

    const meBasic = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: basicCookie },
    });
    expect(meBasic.body.username).toBe(config.auth.username);
    await waitFor(
      async () => {
        expect(await getSessionCount(esClient)).toBe(4);
      },
      10000,
      500
    );

    // Wait 60s for lifespan (10s) to expire and cleanup to run
    await new Promise((r) => setTimeout(r, 60000));

    expect(await getSessionCount(esClient)).toBe(2);

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
});
