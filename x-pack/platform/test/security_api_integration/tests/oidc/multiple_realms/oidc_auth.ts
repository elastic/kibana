/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';
import url from 'url';

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');

  describe('OpenID Connect authentication', () => {
    describe('With multiple OIDC realms configured', () => {
      it('should successfully redirect for the first realm', async () => {
        const handshakeResponse = await supertest
          .post('/api/security/oidc/initiate_login')
          .send({ iss: 'https://test-op.elastic.co' })
          .expect(302);

        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = parseCookie(cookies[0])!;
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
      });

      it('should successfully redirect for the second realm', async () => {
        const handshakeResponse = await supertest
          .post('/api/security/oidc/initiate_login')
          .send({ iss: 'https://test-op-2.elastic.co' })
          .expect(302);

        const cookies = handshakeResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        const handshakeCookie = parseCookie(cookies[0])!;
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
      });
    });
  });
}
