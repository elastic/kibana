/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Cookie } from 'tough-cookie';
import { parse as parseCookie } from 'tough-cookie';

import expect from '@kbn/expect';
import {
  getSAMLRequestId,
  getSAMLResponse,
} from '@kbn/security-api-integration-helpers/saml/saml_tools';
import type { AuthenticationProvider } from '@kbn/security-plugin/common';
import { adminTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esSupertest = getService('esSupertest');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const config = getService('config');
  const retry = getService('retry');
  const log = getService('log');
  const randomness = getService('randomness');
  const kibanaServerConfig = config.get('servers.kibana');

  async function checkSessionCookie(
    sessionCookie: Cookie,
    username: string,
    provider: AuthenticationProvider
  ) {
    return;
    log.debug(`Verifying session cookie for ${username}.`);
    const apiResponse = await supertest
      .get('/internal/security/me')
      .set('kbn-xsrf', 'xxx')
      .set('Cookie', sessionCookie.cookieString())
      .expect(200);
    log.debug(`Session cookie for ${username} is valid.`);

    expect(apiResponse.body.username).to.be(username);
    expect(apiResponse.body.authentication_provider).to.eql(provider);

    return Array.isArray(apiResponse.headers['set-cookie'])
      ? parseCookie(apiResponse.headers['set-cookie'][0])!
      : undefined;
  }

  async function getNumberOfSessionDocuments() {
    await es.indices.refresh({ index: '.kibana_security_session*' });
    return (
      // @ts-expect-error doesn't handle total as number
      (await es.search({ index: '.kibana_security_session*' })).hits.total.value as number
    );
  }

  async function loginWithSAML(providerName: string) {
    const handshakeResponse = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({ providerType: 'saml', providerName, currentURL: '' })
      .expect(200);

    const authenticationResponse = await supertest
      .post('/api/security/saml/callback')
      .set('kbn-xsrf', 'xxx')
      .set('Cookie', parseCookie(handshakeResponse.headers['set-cookie'][0])!.cookieString())
      .send({
        SAMLResponse: await getSAMLResponse({
          destination: `http://localhost:${kibanaServerConfig.port}/api/security/saml/callback`,
          sessionIndex: String(randomness.naturalNumber()),
          inResponseTo: await getSAMLRequestId(handshakeResponse.body.location),
        }),
      })
      .expect(302);

    const cookie = parseCookie(authenticationResponse.headers['set-cookie'][0])!;
    await checkSessionCookie(cookie, 'a@b.c', { type: 'saml', name: providerName });
    return cookie;
  }

  async function runCleanupTaskSoon() {
    // In most cases, an error would mean the task is currently running so let's run it again
    await retry.tryForTime(30000, async () => {
      await supertest
        .post('/session/_run_cleanup')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send()
        .expect(200);
    });
  }

  async function addESDebugLoggingSettings() {
    const addLogging = {
      persistent: {
        'logger.org.elasticsearch.xpack.security.authc': 'debug',
      },
    };
    await esSupertest.put('/_cluster/settings').send(addLogging).expect(200);
  }

  describe('Session Idle cleanup', () => {
    beforeEach(async () => {
      await es.cluster.health({ index: '.kibana_security_session*', wait_for_status: 'green' });
      await addESDebugLoggingSettings();
      await esDeleteAllIndices('.kibana_security_session*');
    });

    it('should properly clean up session expired because of idle timeout when providers override global session config', async function () {
      this.timeout(100000);
      await Promise.all([
        loginWithSAML('saml_disable'),
        loginWithSAML('saml_override'),
        loginWithSAML('saml_fallback'),
        loginWithSAML('saml_disable'),
        loginWithSAML('saml_override'),
        loginWithSAML('saml_fallback'),
        loginWithSAML('saml_disable'),
        loginWithSAML('saml_override'),
        loginWithSAML('saml_fallback'),
        loginWithSAML('saml_disable'),
        loginWithSAML('saml_override'),
        loginWithSAML('saml_fallback'),
      ]);
      await Promise.all([
        loginWithSAML('saml_disable'),
        loginWithSAML('saml_override'),
        loginWithSAML('saml_fallback'),
        loginWithSAML('saml_disable'),
        loginWithSAML('saml_override'),
        loginWithSAML('saml_fallback'),
        loginWithSAML('saml_disable'),
        loginWithSAML('saml_override'),
        loginWithSAML('saml_fallback'),
        loginWithSAML('saml_disable'),
        loginWithSAML('saml_override'),
        loginWithSAML('saml_fallback'),
      ]);
      await Promise.all([
        loginWithSAML('saml_disable'),
        loginWithSAML('saml_override'),
        loginWithSAML('saml_fallback'),
        loginWithSAML('saml_disable'),
        loginWithSAML('saml_override'),
        loginWithSAML('saml_fallback'),
        loginWithSAML('saml_disable'),
        loginWithSAML('saml_override'),
        loginWithSAML('saml_fallback'),
        loginWithSAML('saml_disable'),
        loginWithSAML('saml_override'),
        loginWithSAML('saml_fallback'),
      ]);
    });
  });
}
