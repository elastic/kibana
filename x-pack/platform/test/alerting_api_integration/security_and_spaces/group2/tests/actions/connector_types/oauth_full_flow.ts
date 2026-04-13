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
import type { SupertestWithoutAuthProviderType } from '@kbn/ftr-common-functional-services';
import type { User } from '../../../../../common/types';
import { Space1AllAtSpace1, GlobalReadAtSpace1 } from '../../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

const RETURN_URL = 'https://localhost:5601/app/connectors';

// Echoed Authorization must match `oauth_token.do` responses in servicenow_oauth_simulation.ts; change both if token shape changes.
const SIMULATOR_INITIAL_ACCESS_TOKEN_AUTH = /^Bearer sim-oauth-access-\d+$/;
const SIMULATOR_REFRESHED_ACCESS_TOKEN_AUTH = /^Bearer sim-oauth-access-refreshed-\d+$/;

function stripUrlCredentials(url: string): string {
  const u = new URL(url);
  u.username = '';
  u.password = '';
  return u.toString();
}

async function login(
  supertestWithoutAuth: SupertestWithoutAuthProviderType,
  user: User
): Promise<string> {
  const response = await supertestWithoutAuth
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

async function performOAuthFlow(
  supertestWithoutAuth: SupertestWithoutAuthProviderType,
  {
    spaceId,
    connectorId,
    sessionCookie,
    authCode = 'fake-auth-code',
  }: { spaceId: string; connectorId: string; sessionCookie: string; authCode?: string }
): Promise<void> {
  const { body: startFlowResponse } = await supertestWithoutAuth
    .post(`${getUrlPrefix(spaceId)}/internal/actions/connector/${connectorId}/_start_oauth_flow`)
    .set('Cookie', sessionCookie)
    .set('kbn-xsrf', 'foo')
    .send({ returnUrl: RETURN_URL })
    .expect(200);

  const callbackResponse = await supertestWithoutAuth
    .get(
      `${getUrlPrefix(spaceId)}/api/actions/connector/_oauth_callback?code=${encodeURIComponent(
        authCode
      )}&state=${startFlowResponse.state}`
    )
    .set('Cookie', sessionCookie)
    .redirects(0)
    .expect(302);

  const location = callbackResponse.headers.location;
  expect(location).to.contain('oauth_authorization=success');
  expect(location).to.contain('status_code=200');
}

export default function oauthFullFlowTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  describe('OAuth Authorization Code', () => {
    describe('Full Flow', () => {
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

        for (const { user } of [Space1AllAtSpace1, GlobalReadAtSpace1]) {
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
            name: 'OAuth full flow test connector',
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

      it('completes full OAuth flow and stores per-user token', async () => {
        const { user } = Space1AllAtSpace1;
        await performOAuthFlow(supertestWithoutAuth, {
          spaceId: space.id,
          connectorId,
          sessionCookie: sessionCookies[user.username],
        });

        await supertestWithoutAuth
          .post(
            `${getUrlPrefix(space.id)}/internal/actions/connector/${connectorId}/_oauth_disconnect`
          )
          .set('Cookie', sessionCookies[user.username])
          .set('kbn-xsrf', 'foo')
          .expect(204);
      });

      it('stores independent per-user tokens for different users', async () => {
        const { user: userA } = Space1AllAtSpace1;
        const { user: userB } = GlobalReadAtSpace1;

        await performOAuthFlow(supertestWithoutAuth, {
          spaceId: space.id,
          connectorId,
          sessionCookie: sessionCookies[userA.username],
        });

        await performOAuthFlow(supertestWithoutAuth, {
          spaceId: space.id,
          connectorId,
          sessionCookie: sessionCookies[userB.username],
        });

        await supertestWithoutAuth
          .post(
            `${getUrlPrefix(space.id)}/internal/actions/connector/${connectorId}/_oauth_disconnect`
          )
          .set('Cookie', sessionCookies[userA.username])
          .set('kbn-xsrf', 'foo')
          .expect(204);

        await supertestWithoutAuth
          .post(
            `${getUrlPrefix(space.id)}/internal/actions/connector/${connectorId}/_oauth_disconnect`
          )
          .set('Cookie', sessionCookies[userB.username])
          .set('kbn-xsrf', 'foo')
          .expect(204);
      });

      it('second OAuth flow replaces existing token', async () => {
        const { user } = Space1AllAtSpace1;
        const cookie = sessionCookies[user.username];

        await performOAuthFlow(supertestWithoutAuth, {
          spaceId: space.id,
          connectorId,
          sessionCookie: cookie,
        });

        await performOAuthFlow(supertestWithoutAuth, {
          spaceId: space.id,
          connectorId,
          sessionCookie: cookie,
        });

        await supertestWithoutAuth
          .post(
            `${getUrlPrefix(space.id)}/internal/actions/connector/${connectorId}/_oauth_disconnect`
          )
          .set('Cookie', cookie)
          .set('kbn-xsrf', 'foo')
          .expect(204);
      });
    }); // end Full Flow

    describe('Execution with Token Attachment', () => {
      const objectRemover = new ObjectRemover(supertest);
      const space = Space1AllAtSpace1.space;
      let proxyServer: httpProxy | undefined;
      let sessionCookie: string;

      before(async () => {
        proxyServer = await getHttpProxyServer(
          kibanaServer.resolveUrl('/'),
          configService.get('kbnTestServer.serverArgs'),
          () => {}
        );

        sessionCookie = await login(supertestWithoutAuth, Space1AllAtSpace1.user);
      });

      after(async () => {
        await objectRemover.removeAll();
        if (proxyServer) {
          proxyServer.close();
        }
      });

      it('connector execution uses stored OAuth token', async () => {
        const simulatorBaseRaw = kibanaServer.resolveUrl(
          getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
        );
        const tokenUrl = `${simulatorBaseRaw}/oauth_token.do`;
        const echoUrl = `${stripUrlCredentials(simulatorBaseRaw)}/echo`;

        const { body: connector } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'OAuth executor echo connector',
            connector_type_id: 'test.oauth-executor',
            config: { echoUrl },
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

        await performOAuthFlow(supertestWithoutAuth, {
          spaceId: space.id,
          connectorId: connector.id,
          sessionCookie,
        });

        const { body: executeBody } = await supertestWithoutAuth
          .post(`${getUrlPrefix(space.id)}/api/actions/connector/${connector.id}/_execute`)
          .set('Cookie', sessionCookie)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {},
          })
          .expect(200);

        expect(executeBody.status).to.be('ok');
        expect(executeBody.connector_id).to.be(connector.id);
        expect(executeBody.data.receivedAuth).to.match(SIMULATOR_INITIAL_ACCESS_TOKEN_AUTH);
      });

      it('connector execution refreshes expired token', async function () {
        this.timeout(120_000);

        const simulatorBaseRaw = kibanaServer.resolveUrl(
          getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
        );
        const tokenUrl = `${simulatorBaseRaw}/oauth_token.do`;
        const echoUrl = `${stripUrlCredentials(simulatorBaseRaw)}/echo`;

        const { body: connector } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'OAuth executor refresh connector',
            connector_type_id: 'test.oauth-executor',
            config: { echoUrl },
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

        await performOAuthFlow(supertestWithoutAuth, {
          spaceId: space.id,
          connectorId: connector.id,
          sessionCookie,
          authCode: 'fake-auth-code-short-expiry',
        });

        await new Promise((r) => setTimeout(r, 2500));

        const { body: executeBody } = await supertestWithoutAuth
          .post(`${getUrlPrefix(space.id)}/api/actions/connector/${connector.id}/_execute`)
          .set('Cookie', sessionCookie)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {},
          })
          .expect(200);

        expect(executeBody.status).to.be('ok');
        expect(executeBody.connector_id).to.be(connector.id);
        expect(executeBody.data.receivedAuth).to.match(SIMULATOR_REFRESHED_ACCESS_TOKEN_AUTH);
      });
    }); // end Execution with Token Attachment
  }); // end OAuth Authorization Code
}
