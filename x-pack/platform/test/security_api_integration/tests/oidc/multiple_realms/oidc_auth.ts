/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';
import url from 'url';

import expect from '@kbn/expect';
import { getStateAndNonce } from '@kbn/security-api-integration-helpers/oidc/oidc_tools';

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');

  describe('OpenID Connect authentication', () => {
    describe('With multiple OIDC realms configured', () => {
      it('should successfully authenticate to the first realm', async () => {
        const handshakeResponse = await supertest
          .post('/api/security/oidc/initiate_login')
          .send({ iss: 'https://test-op.elastic.co' })
          .expect(302);

        const handshakeCookies = handshakeResponse.headers['set-cookie'];
        expect(handshakeCookies).to.have.length(1);

        const handshakeCookie = parseCookie(handshakeCookies[0])!;
        expect(handshakeCookie.key).to.be('sid');
        expect(handshakeCookie.value).to.not.be.empty();
        expect(handshakeCookie.path).to.be('/');
        expect(handshakeCookie.httpOnly).to.be(true);

        const redirectURL = url.parse(
          handshakeResponse.headers.location,
          true /* parseQueryString */
        );
        expect(
          redirectURL.href!.startsWith(`https://test-op.elastic.co/oauth2/v1/authorize`)
        ).to.be(true);
        expect(redirectURL.query.scope).to.not.be.empty();
        expect(redirectURL.query.response_type).to.not.be.empty();
        expect(redirectURL.query.client_id).to.not.be.empty();
        expect(redirectURL.query.redirect_uri).to.not.be.empty();
        expect(redirectURL.query.state).to.not.be.empty();
        expect(redirectURL.query.nonce).to.not.be.empty();

        const stateAndNonce = getStateAndNonce(handshakeResponse.headers.location);

        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);

        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code2&state=${stateAndNonce.state}`)
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);
        const authenticationResponseCookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(authenticationResponseCookies).to.have.length(1);

        const sessionCookie = parseCookie(authenticationResponseCookies[0])!;
        expect(sessionCookie.key).to.be('sid');
        expect(sessionCookie.value).to.not.be.empty();
        expect(sessionCookie.path).to.be('/');
        expect(sessionCookie.httpOnly).to.be(true);

        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);
        expect(apiResponse.body).to.have.keys([
          'username',
          'full_name',
          'email',
          'roles',
          'metadata',
          'enabled',
          'authentication_realm',
          'lookup_realm',
          'authentication_provider',
          'authentication_type',
          'elastic_cloud_user',
        ]);

        expect(apiResponse.body.username).to.be('user2');
        expect(apiResponse.body.authentication_realm).to.eql({ name: 'oidc1', type: 'oidc' });
        expect(apiResponse.body.authentication_provider).to.eql({ type: 'oidc', name: 'oidc1' });
        expect(apiResponse.body.authentication_type).to.be('token');
      });

      it('should successfully authenticate to the second realm', async () => {
        const handshakeResponse = await supertest
          .post('/api/security/oidc/initiate_login')
          .send({ iss: 'https://test-op-2.elastic.co' })
          .expect(302);

        const handshakeCookies = handshakeResponse.headers['set-cookie'];
        expect(handshakeCookies).to.have.length(1);

        const handshakeCookie = parseCookie(handshakeCookies[0])!;
        expect(handshakeCookie.key).to.be('sid');
        expect(handshakeCookie.value).to.not.be.empty();
        expect(handshakeCookie.path).to.be('/');
        expect(handshakeCookie.httpOnly).to.be(true);

        const redirectURL = url.parse(
          handshakeResponse.headers.location,
          true /* parseQueryString */
        );
        expect(
          redirectURL.href!.startsWith(`https://test-op-2.elastic.co/oauth2/v1/authorize`)
        ).to.be(true);
        expect(redirectURL.query.scope).to.not.be.empty();
        expect(redirectURL.query.response_type).to.not.be.empty();
        expect(redirectURL.query.client_id).to.not.be.empty();
        expect(redirectURL.query.redirect_uri).to.not.be.empty();
        expect(redirectURL.query.state).to.not.be.empty();
        expect(redirectURL.query.nonce).to.not.be.empty();

        const stateAndNonce = getStateAndNonce(handshakeResponse.headers.location);

        await supertest
          .post('/api/oidc_provider/setup')
          .set('kbn-xsrf', 'xxx')
          .send({ nonce: stateAndNonce.nonce })
          .expect(200);

        const oidcAuthenticationResponse = await supertest
          .get(`/api/security/oidc/callback?code=code2&state=${stateAndNonce.state}`)
          .set('Cookie', handshakeCookie.cookieString())
          .expect(302);
        const authenticationResponseCookies = oidcAuthenticationResponse.headers['set-cookie'];
        expect(authenticationResponseCookies).to.have.length(1);

        const sessionCookie = parseCookie(authenticationResponseCookies[0])!;
        expect(sessionCookie.key).to.be('sid');
        expect(sessionCookie.value).to.not.be.empty();
        expect(sessionCookie.path).to.be('/');
        expect(sessionCookie.httpOnly).to.be(true);

        const apiResponse = await supertest
          .get('/internal/security/me')
          .set('kbn-xsrf', 'xxx')
          .set('Cookie', sessionCookie.cookieString())
          .expect(200);
        expect(apiResponse.body).to.have.keys([
          'username',
          'full_name',
          'email',
          'roles',
          'metadata',
          'enabled',
          'authentication_realm',
          'lookup_realm',
          'authentication_provider',
          'authentication_type',
          'elastic_cloud_user',
        ]);

        expect(apiResponse.body.username).to.be('user2');
        expect(apiResponse.body.authentication_realm).to.eql({ name: 'oidc2', type: 'oidc' });
        expect(apiResponse.body.authentication_provider).to.eql({ type: 'oidc', name: 'oidc2' });
        expect(apiResponse.body.authentication_type).to.be('token');
      });
    });
  });
}
