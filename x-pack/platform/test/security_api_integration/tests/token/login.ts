/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');

  function extractSessionCookie(response: { headers: Record<string, string[]> }) {
    const cookie = (response.headers['set-cookie'] || []).find((header) =>
      header.startsWith('sid=')
    );
    return cookie ? parseCookie(cookie) : undefined;
  }

  describe('login', () => {
    it('accepts valid login credentials as 200 status', async () => {
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'true')
        .send({
          providerType: 'token',
          providerName: 'token',
          currentURL: '/',
          params: { username: 'elastic', password: 'changeme' },
        })
        .expect(200);
    });

    it('sets HttpOnly cookie with valid login', async () => {
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'true')
        .send({
          providerType: 'token',
          providerName: 'token',
          currentURL: '/',
          params: { username: 'elastic', password: 'changeme' },
        })
        .expect(200);

      const cookie = extractSessionCookie(response);
      if (!cookie) {
        throw new Error('No session cookie set');
      }

      if (!cookie.httpOnly) {
        throw new Error('Session cookie is not marked as HttpOnly');
      }
    });

    it('rejects without kbn-xsrf header as 400 status even if credentials are valid', async () => {
      const response = await supertest
        .post('/internal/security/login')
        .send({
          providerType: 'token',
          providerName: 'token',
          currentURL: '/',
          params: { username: 'elastic', password: 'changeme' },
        })
        .expect(400);

      if (extractSessionCookie(response)) {
        throw new Error('Session cookie was set despite invalid login');
      }
    });

    it('rejects without credentials as 400 status', async () => {
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'true')
        .expect(400);

      if (extractSessionCookie(response)) {
        throw new Error('Session cookie was set despite invalid login');
      }
    });

    it('rejects without password as 400 status', async () => {
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'true')
        .send({
          providerType: 'token',
          providerName: 'token',
          currentURL: '/',
          params: { username: 'elastic' },
        })
        .expect(400);

      if (extractSessionCookie(response)) {
        throw new Error('Session cookie was set despite invalid login');
      }
    });

    it('rejects without username as 400 status', async () => {
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'true')
        .send({
          providerType: 'token',
          providerName: 'token',
          currentURL: '/',
          params: { password: 'changeme' },
        })
        .expect(400);

      if (extractSessionCookie(response)) {
        throw new Error('Session cookie was set despite invalid login');
      }
    });

    it('rejects invalid credentials as 401 status', async () => {
      const response = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'true')
        .send({
          providerType: 'token',
          providerName: 'token',
          currentURL: '/',
          params: { username: 'elastic', password: 'notvalidpassword' },
        })
        .expect(401);

      if (extractSessionCookie(response)) {
        throw new Error('Session cookie was set despite invalid login');
      }
    });

    it('should support minimal authentication', async () => {
      const loginResponse = await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'true')
        .send({
          providerType: 'token',
          providerName: 'token',
          currentURL: '/',
          params: { username: 'elastic', password: 'changeme' },
        })
        .expect(200);

      const sessionCookie = extractSessionCookie(loginResponse);
      if (!sessionCookie) {
        throw new Error('No session cookie set');
      }

      // Access the minimal and default auth endpoint with the session cookie.
      const minimalResponse = await supertest
        .get('/authentication/fast/me')
        .set('Cookie', sessionCookie.cookieString())
        .expect(200);
      const defaultResponse = await supertest
        .get('/internal/security/me')
        .set('Cookie', sessionCookie.cookieString())
        .expect(200);

      expect(minimalResponse.body.principal.username).to.eql(defaultResponse.body.username);
      expect(minimalResponse.body.principal.username).to.eql('elastic');

      expect(minimalResponse.body.principal.authentication_provider).to.eql(
        defaultResponse.body.authentication_provider
      );
      expect(minimalResponse.body.principal.authentication_provider).to.eql({
        type: 'token',
        name: 'token',
      });

      // In minimal authentication mode, unlike when in default authentication mode, we don't call ES Authenticate API,
      // so we don't have `authentication_realm` information available.
      expect(minimalResponse.body.principal).to.not.have.property('authentication_realm');
      expect(defaultResponse.body).to.have.property('authentication_realm');
    });
  });
}
