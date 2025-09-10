/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import type { Cookie } from 'tough-cookie';
import { parse as parseCookie } from 'tough-cookie';

import { CA_CERT_PATH } from '@kbn/dev-utils';
import expect from '@kbn/expect';

import { getSAMLResponse } from '@kbn/security-api-integration-helpers/saml/saml_tools';
import type { AuthenticationProvider } from '@kbn/security-plugin/common';

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const randomness = getService('randomness');
  const supertest = getService('supertestWithoutAuth');
  const config = getService('config');

  const kibanaServerConfig = config.get('servers.kibana');

  const CA_CERT = readFileSync(CA_CERT_PATH);
  const CLIENT_CERT = readFileSync(
    require.resolve('@kbn/security-api-integration-helpers/pki/first_client.p12')
  );

  async function checkSessionCookie(
    sessionCookie: Cookie,
    username: string,
    provider: AuthenticationProvider,
    authenticationRealm: { name: string; type: string } | null,
    authenticationType: string
  ) {
    expect(sessionCookie.key).to.be('sid');
    expect(sessionCookie.value).to.not.be.empty();
    expect(sessionCookie.path).to.be('/');
    expect(sessionCookie.httpOnly).to.be(true);

    const apiResponse = await supertest
      .get('/internal/security/me')
      .ca(CA_CERT)
      .pfx(CLIENT_CERT)
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

    expect(apiResponse.body.username).to.be(username);
    expect(apiResponse.body.authentication_provider).to.eql(provider);
    if (authenticationRealm) {
      expect(apiResponse.body.authentication_realm).to.eql(authenticationRealm);
    }
    expect(apiResponse.body.authentication_type).to.be(authenticationType);
  }

  describe('Relay State into onboarding flow', () => {
    function createSAMLResponse(options = {}) {
      return getSAMLResponse({
        destination: `http://localhost:${kibanaServerConfig.port}/api/security/saml/callback`,
        sessionIndex: String(randomness.naturalNumber()),
        ...options,
      });
    }

    it('should redirect to URL from relay state and keeping query string', async () => {
      for (const { providerName, redirectURL } of [
        {
          providerName: 'saml1',
          redirectURL: `/app/cloud/onboarding?onboarding_token=vector&next=${encodeURIComponent(
            '/app/elasticsearch/start'
          )}`,
        },
        {
          providerName: 'saml1',
          redirectURL: `/app/cloud/onboarding?onboarding_token=vector&next=${encodeURIComponent(
            '/app/elasticsearch/start'
          )}#some=hash-value`,
        },
      ]) {
        const authenticationResponse = await supertest
          .post('/api/security/saml/callback')
          .ca(CA_CERT)
          .type('form')
          .send({
            SAMLResponse: await createSAMLResponse({
              issuer: `http://www.elastic.co/${providerName}`,
            }),
          })
          .send({ RelayState: redirectURL })
          .expect(302);

        // User should be redirected to the base URL.
        expect(authenticationResponse.headers.location).to.be(redirectURL);

        const cookies = authenticationResponse.headers['set-cookie'];
        expect(cookies).to.have.length(1);

        await checkSessionCookie(
          parseCookie(cookies[0])!,
          'a@b.c',
          { type: 'saml', name: providerName },
          { name: providerName, type: 'saml' },
          'token'
        );
      }
    });
  });
}
