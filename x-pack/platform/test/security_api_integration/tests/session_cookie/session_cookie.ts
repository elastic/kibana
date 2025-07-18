/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';

import expect from '@kbn/expect';
import { adminTestUser, kibanaTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');

  async function adminSessionCookie() {
    const response = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({
        providerType: 'basic',
        providerName: 'basic',
        currentURL: '/',
        params: { username: adminTestUser.username, password: adminTestUser.password },
      })
      .expect(200);

    const cookies = response.headers['set-cookie'];
    expect(cookies).to.have.length(1);

    const cookie = parseCookie(cookies[0])!;
    return cookie;
  }

  async function basicSessionCookie() {
    const response = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({
        providerType: 'basic',
        providerName: 'basic',
        currentURL: '/',
        params: { username: kibanaTestUser.username, password: kibanaTestUser.password },
      })
      .expect(200);

    const cookies = response.headers['set-cookie'];
    expect(cookies).to.have.length(1);

    const cookie = parseCookie(cookies[0])!;
    return cookie;
  }

  describe('Session Cookie', function () {
    it('should allow a single valid cookie', async () => {
      const cookie = await adminSessionCookie();
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', cookie.cookieString())
        .expect(200);
    });

    it('should allow a multiple cookies that are the same', async () => {
      const cookie = await adminSessionCookie();

      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', [cookie.cookieString(), cookie.cookieString()])
        .expect(200);
    });

    it('should not allow multiple different cookies', async () => {
      const cookie = await adminSessionCookie();
      const basicUserCookie = await basicSessionCookie();
      await supertest
        .get('/internal/security/me')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', [cookie.cookieString(), basicUserCookie.cookieString()])
        .expect(401);
    });
  });
}
