/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '@kbn/actions-simulators-plugin/server/plugin';
import type { SupertestWithoutAuthProviderType } from '@kbn/ftr-common-functional-services';
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

export default function oAuthStartFlowTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');

  describe('OAuth _start_oauth_flow', () => {
    const objectRemover = new ObjectRemover(supertest);
    const space = Space1AllAtSpace1.space;
    let connectorId: string;
    const sessionCookies: Record<string, string> = {};

    before(async () => {
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
          name: 'OAuth test connector',
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
    });

    describe('user with actions "all" privilege', () => {
      const { user } = Space1AllAtSpace1;

      it('should return authorizationUrl and state', async () => {
        const { body } = await supertestWithoutAuth
          .post(
            `${getUrlPrefix(space.id)}/internal/actions/connector/${connectorId}/_start_oauth_flow`
          )
          .set('Cookie', sessionCookies[user.username])
          .set('kbn-xsrf', 'foo')
          .send({ returnUrl: RETURN_URL })
          .expect(200);

        expect(body.authorizationUrl).to.be.a('string');
        expect(body.state).to.be.a('string');
      });
    });

    describe('user with actions "read" privilege', () => {
      const { user } = GlobalReadAtSpace1;

      it('should return authorizationUrl and state', async () => {
        const { body } = await supertestWithoutAuth
          .post(
            `${getUrlPrefix(space.id)}/internal/actions/connector/${connectorId}/_start_oauth_flow`
          )
          .set('Cookie', sessionCookies[user.username])
          .set('kbn-xsrf', 'foo')
          .send({ returnUrl: RETURN_URL })
          .expect(200);

        expect(body.authorizationUrl).to.be.a('string');
        expect(body.state).to.be.a('string');
      });
    });

    describe('user without actions feature privilege', () => {
      const { user: unprivilegedUser } = Space1AllAlertingNoneActionsAtSpace1;

      it('should return 403 because the user lacks the required API privilege', async () => {
        await supertestWithoutAuth
          .post(
            `${getUrlPrefix(space.id)}/internal/actions/connector/${connectorId}/_start_oauth_flow`
          )
          .set('Cookie', sessionCookies[unprivilegedUser.username])
          .set('kbn-xsrf', 'foo')
          .send({ returnUrl: RETURN_URL })
          .expect(403);
      });
    });
  });
}
