/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type httpProxy from 'http-proxy';
import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '@kbn/actions-simulators-plugin/server/plugin';
import {
  Space1AllAtSpace1,
  GlobalReadAtSpace1,
  Space1AllAlertingNoneActionsAtSpace1,
} from '../../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { login, performOAuthFlow } from './oauth_test_helpers';

export default function oAuthDisconnectTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  describe('OAuth _oauth_disconnect', () => {
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
          name: 'OAuth disconnect test connector',
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

      it('should disconnect after a successful OAuth flow', async () => {
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
    });

    describe('user with actions "read" privilege', () => {
      const { user } = GlobalReadAtSpace1;

      it('should disconnect after a successful OAuth flow', async () => {
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
    });

    describe('user without actions feature privilege', () => {
      const { user: unprivilegedUser } = Space1AllAlertingNoneActionsAtSpace1;

      it('should return 403 because the user lacks the required API privilege', async () => {
        await supertestWithoutAuth
          .post(
            `${getUrlPrefix(space.id)}/internal/actions/connector/${connectorId}/_oauth_disconnect`
          )
          .set('Cookie', sessionCookies[unprivilegedUser.username])
          .set('kbn-xsrf', 'foo')
          .expect(403);
      });
    });
  });
}
