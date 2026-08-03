/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type httpProxy from 'http-proxy';
import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { Space1AllAtSpace1, GlobalReadAtSpace1 } from '../../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { login, RETURN_URL } from './oauth_test_helpers';

export default function oauthSecurityTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  describe('OAuth Authorization Code Security', () => {
    const objectRemover = new ObjectRemover(supertest);
    const space = Space1AllAtSpace1.space;
    let proxyServer: httpProxy | undefined;
    const sessionCookies: Record<string, string> = {};

    before(async () => {
      proxyServer = await getHttpProxyServer(
        kibanaServer.resolveUrl('/'),
        configService.get('kbnTestServer.serverArgs'),
        () => {}
      );

      for (const { user } of [Space1AllAtSpace1, GlobalReadAtSpace1]) {
        sessionCookies[user.username] = await login(supertestWithoutAuth, user);
      }
    });

    after(async () => {
      await objectRemover.removeAll();
      if (proxyServer) {
        proxyServer.close();
      }
    });

    it('rejects _start_oauth_flow when authorizationUrl is not in allowedHosts', async () => {
      const tokenUrl =
        kibanaServer.resolveUrl(
          getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
        ) + '/oauth_token.do';

      const { body: connector } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OAuth security bad authorizationUrl',
          connector_type_id: 'test.oauth-connector',
          config: {},
          secrets: {
            authType: 'oauth_authorization_code',
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            tokenUrl,
            authorizationUrl: 'https://evil.example.com/oauth/authorize',
          },
        })
        .expect(200);

      objectRemover.add(space.id, connector.id, 'connector', 'actions');

      const { user } = Space1AllAtSpace1;
      const { body } = await supertestWithoutAuth
        .post(
          `${getUrlPrefix(space.id)}/internal/actions/connector/${connector.id}/_start_oauth_flow`
        )
        .set('Cookie', sessionCookies[user.username])
        .set('kbn-xsrf', 'foo')
        .send({ returnUrl: RETURN_URL })
        .expect(400);

      expect(body.message).to.contain('https://evil.example.com/oauth/authorize');
      expect(body.message).to.contain('xpack.actions.allowedHosts');
    });

    it('rejects _start_oauth_flow when tokenUrl is not in allowedHosts', async () => {
      const { body: connector } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OAuth security bad tokenUrl',
          connector_type_id: 'test.oauth-connector',
          config: {},
          secrets: {
            authType: 'oauth_authorization_code',
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            tokenUrl: 'https://evil.example.com/oauth/token',
            authorizationUrl: 'https://localhost:5601/oauth/authorize',
          },
        })
        .expect(200);

      objectRemover.add(space.id, connector.id, 'connector', 'actions');

      const { user } = Space1AllAtSpace1;
      const { body } = await supertestWithoutAuth
        .post(
          `${getUrlPrefix(space.id)}/internal/actions/connector/${connector.id}/_start_oauth_flow`
        )
        .set('Cookie', sessionCookies[user.username])
        .set('kbn-xsrf', 'foo')
        .send({ returnUrl: RETURN_URL })
        .expect(400);

      expect(body.message).to.contain('https://evil.example.com/oauth/token');
      expect(body.message).to.contain('xpack.actions.allowedHosts');
    });

    it('rejects callback when a different user completes the flow', async () => {
      const tokenUrl =
        kibanaServer.resolveUrl(
          getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
        ) + '/oauth_token.do';

      const { body: connector } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OAuth security cross-user',
          connector_type_id: 'test.oauth-connector',
          config: {},
          secrets: {
            authType: 'oauth_authorization_code',
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            tokenUrl,
            authorizationUrl: 'https://localhost:5601/oauth/authorize',
          },
        })
        .expect(200);

      objectRemover.add(space.id, connector.id, 'connector', 'actions');

      const { user: userA } = Space1AllAtSpace1;
      const { user: userB } = GlobalReadAtSpace1;

      const { body: startFlowResponse } = await supertestWithoutAuth
        .post(
          `${getUrlPrefix(space.id)}/internal/actions/connector/${connector.id}/_start_oauth_flow`
        )
        .set('Cookie', sessionCookies[userA.username])
        .set('kbn-xsrf', 'foo')
        .send({ returnUrl: RETURN_URL })
        .expect(200);

      const callbackResponse = await supertestWithoutAuth
        .get(
          `${getUrlPrefix(
            space.id
          )}/api/actions/connector/_oauth_callback?code=fake-auth-code&state=${
            startFlowResponse.state
          }`
        )
        .set('Cookie', sessionCookies[userB.username])
        .redirects(0)
        .expect(302);

      const location = callbackResponse.headers.location;
      expect(location).to.contain('oauth_authorization=error');
      expect(location).to.contain('status_code=403');
    });

    it('rejects callback with invalid state parameter', async () => {
      const { user } = GlobalReadAtSpace1;

      // Unknown state → no oauthState → no returnUrl → handler renders an HTML error page (200). When state is valid, errors redirect (302) with query params.
      const res = await supertestWithoutAuth
        .get(
          `${getUrlPrefix(
            space.id
          )}/api/actions/connector/_oauth_callback?code=fake-auth-code&state=unknown-state-value`
        )
        .set('Cookie', sessionCookies[user.username])
        .expect(200);

      expect(res.text).to.contain('Invalid or expired state parameter');
    });

    it('rejects callback with missing code parameter', async () => {
      const tokenUrl =
        kibanaServer.resolveUrl(
          getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
        ) + '/oauth_token.do';

      const { body: connector } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OAuth security missing code',
          connector_type_id: 'test.oauth-connector',
          config: {},
          secrets: {
            authType: 'oauth_authorization_code',
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            tokenUrl,
            authorizationUrl: 'https://localhost:5601/oauth/authorize',
          },
        })
        .expect(200);

      objectRemover.add(space.id, connector.id, 'connector', 'actions');

      const { user } = Space1AllAtSpace1;

      const { body: startFlowResponse } = await supertestWithoutAuth
        .post(
          `${getUrlPrefix(space.id)}/internal/actions/connector/${connector.id}/_start_oauth_flow`
        )
        .set('Cookie', sessionCookies[user.username])
        .set('kbn-xsrf', 'foo')
        .send({ returnUrl: RETURN_URL })
        .expect(200);

      const callbackResponse = await supertestWithoutAuth
        .get(
          `${getUrlPrefix(space.id)}/api/actions/connector/_oauth_callback?state=${
            startFlowResponse.state
          }`
        )
        .set('Cookie', sessionCookies[user.username])
        .redirects(0)
        .expect(302);

      const location = callbackResponse.headers.location;
      expect(location).to.contain('oauth_authorization=error');
      expect(location).to.contain('status_code=400');
      expect(decodeURIComponent(location.replace(/\+/g, ' '))).to.contain(
        'Missing required OAuth authorization code'
      );
    });
  });
}
