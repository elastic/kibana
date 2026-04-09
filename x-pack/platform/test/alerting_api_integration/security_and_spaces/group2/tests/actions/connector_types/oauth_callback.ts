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
import type { User } from '../../../../../common/types';
import {
  Space1AllAtSpace1,
  GlobalReadAtSpace1,
  Space1AllAlertingNoneActionsAtSpace1,
} from '../../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

const RETURN_URL = 'https://localhost:5601/app/connectors';

async function login(
  supertestWithoutAuth: ReturnType<FtrProviderContext['getService']>,
  user: User
): Promise<string> {
  const response = await (supertestWithoutAuth as any)
    .post('/internal/security/login')
    .set('kbn-xsrf', 'xxx')
    .send({
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: { username: user.username, password: user.password },
    })
    .expect(200);

  return response.header['set-cookie'][0];
}

export default function oAuthCallbackTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  describe('OAuth _oauth_callback', () => {
    const objectRemover = new ObjectRemover(supertest);
    const space = Space1AllAtSpace1.space;
    let connectorId: string;
    let proxyServer: httpProxy | undefined;
    const sessionCookies: Record<string, string> = {};

    before(async () => {
      proxyServer = await getHttpProxyServer(
        kibanaServer.resolveUrl('/'),
        configService.get('kbnTestServer.serverArgs'),
        () => {}
      );

      for (const { user } of [
        Space1AllAtSpace1,
        GlobalReadAtSpace1,
        Space1AllAlertingNoneActionsAtSpace1,
      ]) {
        sessionCookies[user.username] = await login(supertestWithoutAuth, user);
      }

      const tokenUrl =
        kibanaServer.resolveUrl(
          getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
        ) + '/oauth_token.do';

      const { body: connector } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'OAuth callback test connector',
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

      connectorId = connector.id;
      objectRemover.add(space.id, connectorId, 'connector', 'actions');
    });

    after(async () => {
      await objectRemover.removeAll();
      if (proxyServer) {
        proxyServer.close();
      }
    });

    describe('user with actions "all" privilege', () => {
      const { user } = Space1AllAtSpace1;

      it('should complete the full OAuth authorize and callback flow', async () => {
        const { body: startFlowResponse } = await supertestWithoutAuth
          .post(
            `${getUrlPrefix(space.id)}/internal/actions/connector/${connectorId}/_start_oauth_flow`
          )
          .set('Cookie', sessionCookies[user.username])
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
          .set('Cookie', sessionCookies[user.username])
          .redirects(0)
          .expect(302);

        const location = callbackResponse.headers.location;
        expect(location).to.contain('oauth_authorization=success');
        expect(location).to.contain('status_code=200');
      });
    });

    describe('user with actions "read" privilege', () => {
      const { user } = GlobalReadAtSpace1;

      it('should complete the full OAuth authorize and callback flow', async () => {
        const { body: startFlowResponse } = await supertestWithoutAuth
          .post(
            `${getUrlPrefix(space.id)}/internal/actions/connector/${connectorId}/_start_oauth_flow`
          )
          .set('Cookie', sessionCookies[user.username])
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
          .set('Cookie', sessionCookies[user.username])
          .redirects(0)
          .expect(302);

        const location = callbackResponse.headers.location;
        expect(location).to.contain('oauth_authorization=success');
        expect(location).to.contain('status_code=200');
      });
    });

    describe('user without actions feature privilege', () => {
      const { user: unprivilegedUser } = Space1AllAlertingNoneActionsAtSpace1;

      it('should return 403 because the user lacks the required API privilege', async () => {
        await supertestWithoutAuth
          .get(
            `${getUrlPrefix(
              space.id
            )}/api/actions/connector/_oauth_callback?code=fake-auth-code&state=some-state`
          )
          .set('Cookie', sessionCookies[unprivilegedUser.username])
          .redirects(0)
          .expect(403);
      });
    });
  });
}
