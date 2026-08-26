/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, apiTest as test } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const KBN_XSRF = 'xxx';

function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
  const list = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
    ? [setCookieHeader]
    : [];
  const sidCookie = list.find((c) => c.startsWith('sid='));
  if (!sidCookie) throw new Error('No sid cookie found in Set-Cookie headers');
  return sidCookie.split(';')[0];
}

test.describe('Session Cookie', { tag: [...tags.stateful.classic] }, () => {
  async function loginWithBasic(
    apiClient: any,
    username: string,
    password: string
  ): Promise<string> {
    const response = await apiClient.post('/internal/security/login', {
      headers: { 'kbn-xsrf': KBN_XSRF },
      body: {
        providerType: 'basic',
        providerName: 'cloud-basic',
        currentURL: '/',
        params: { username, password },
      },
    });
    expect(response).toHaveStatusCode(200);
    return extractSessionCookie(response.headers['set-cookie'] as string | string[]);
  }

  test('should allow a single valid cookie', async ({ apiClient, config }) => {
    const cookie = await loginWithBasic(apiClient, config.auth.username, config.auth.password);
    const response = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: cookie },
    });
    expect(response).toHaveStatusCode(200);
  });

  test('should allow multiple cookies that are the same', async ({ apiClient, config }) => {
    const cookie = await loginWithBasic(apiClient, config.auth.username, config.auth.password);
    const response = await apiClient.get('/internal/security/me', {
      headers: { 'kbn-xsrf': KBN_XSRF, Cookie: `${cookie}; ${cookie}` },
    });
    expect(response).toHaveStatusCode(200);
  });

  test('should not allow multiple different cookies', async ({ apiClient, config, esClient }) => {
    const cookie1 = await loginWithBasic(apiClient, config.auth.username, config.auth.password);

    // Create a second user for the second cookie
    await esClient.security.putUser({
      username: 'session_cookie_test_user',
      body: { password: 'changeme', roles: ['kibana_admin'], full_name: 'Session Cookie Test' },
    } as any);

    try {
      const cookie2 = await loginWithBasic(apiClient, 'session_cookie_test_user', 'changeme');
      const response = await apiClient.get('/internal/security/me', {
        headers: { 'kbn-xsrf': KBN_XSRF, Cookie: `${cookie1}; ${cookie2}` },
      });
      expect(response).toHaveStatusCode(401);
    } finally {
      await esClient.security.deleteUser({ username: 'session_cookie_test_user' } as any);
    }
  });
});
