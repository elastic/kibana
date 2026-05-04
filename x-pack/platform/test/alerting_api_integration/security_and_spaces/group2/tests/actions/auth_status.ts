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
import { UserAtSpaceScenarios, Space1AllAtSpace1, Space2 } from '../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { login, performOAuthFlow } from './connector_types/oauth_test_helpers';

const USER_AUTH_STATUSES = ['connected', 'not_connected', 'not_applicable'] as const;

function assertAuthStatusBodyShape(body: Record<string, { user_auth_status: string }>) {
  expect(body).to.be.an('object');
  for (const entry of Object.values(body)) {
    expect(entry).to.have.property('user_auth_status');
    expect(
      USER_AUTH_STATUSES.includes(entry.user_auth_status as (typeof USER_AUTH_STATUSES)[number])
    ).to.be(true);
  }
}

export default function authStatusTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  describe('POST /internal/actions/connectors/_me/auth_status', () => {
    const objectRemover = new ObjectRemover(supertest);
    const space = Space1AllAtSpace1.space;

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('returns snake_case user_auth_status and distinguishes shared vs per-user connectors', async () => {
      const { body: sharedConnector } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Auth status shared connector',
          connector_type_id: 'test.index-record',
          config: { unencrypted: 'x' },
          secrets: { encrypted: 'y' },
        })
        .expect(200);
      objectRemover.add(space.id, sharedConnector.id, 'connector', 'actions');

      const tokenUrl =
        kibanaServer.resolveUrl(
          getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
        ) + '/oauth_token.do';

      const { body: oauthConnector } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Auth status oauth connector',
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
      objectRemover.add(space.id, oauthConnector.id, 'connector', 'actions');

      const { body } = await supertest
        .post(`${getUrlPrefix(space.id)}/internal/actions/connectors/_me/auth_status`)
        .set('kbn-xsrf', 'foo')
        .send({})
        .expect(200);

      assertAuthStatusBodyShape(body);
      expect(body[sharedConnector.id].user_auth_status).to.eql('not_applicable');
      expect(body[oauthConnector.id].user_auth_status).to.eql('not_connected');
    });

    it('does not include connectors from other spaces', async () => {
      const { body: space1Connector } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Auth status space1',
          connector_type_id: 'test.index-record',
          config: { unencrypted: 'a' },
          secrets: { encrypted: 'b' },
        })
        .expect(200);
      objectRemover.add(space.id, space1Connector.id, 'connector', 'actions');

      const { body: space2Connector } = await supertest
        .post(`${getUrlPrefix(Space2.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'Auth status space2',
          connector_type_id: 'test.index-record',
          config: { unencrypted: 'c' },
          secrets: { encrypted: 'd' },
        })
        .expect(200);
      objectRemover.add(Space2.id, space2Connector.id, 'connector', 'actions');

      const { body } = await supertest
        .post(`${getUrlPrefix(space.id)}/internal/actions/connectors/_me/auth_status`)
        .set('kbn-xsrf', 'foo')
        .send({})
        .expect(200);

      expect(body).to.have.property(space1Connector.id);
      expect(body).not.to.have.property(space2Connector.id);
    });

    describe('with OAuth simulator and session', () => {
      let proxyServer: httpProxy | undefined;
      let sessionCookie: string;
      let connectorId: string;

      before(async () => {
        proxyServer = await getHttpProxyServer(
          kibanaServer.resolveUrl('/'),
          configService.get('kbnTestServer.serverArgs'),
          () => {}
        );

        sessionCookie = await login(supertestWithoutAuth, Space1AllAtSpace1.user);

        const tokenUrl =
          kibanaServer.resolveUrl(
            getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
          ) + '/oauth_token.do';

        const { body: connector } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'Auth status OAuth flow connector',
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

      it('reports connected after OAuth stores a per-user token', async () => {
        const beforeAuth = await supertestWithoutAuth
          .post(`${getUrlPrefix(space.id)}/internal/actions/connectors/_me/auth_status`)
          .set('Cookie', sessionCookie)
          .set('kbn-xsrf', 'foo')
          .send({})
          .expect(200);

        expect(beforeAuth.body[connectorId].user_auth_status).to.eql('not_connected');

        await performOAuthFlow(supertestWithoutAuth, {
          spaceId: space.id,
          connectorId,
          sessionCookie,
        });

        const afterAuth = await supertestWithoutAuth
          .post(`${getUrlPrefix(space.id)}/internal/actions/connectors/_me/auth_status`)
          .set('Cookie', sessionCookie)
          .set('kbn-xsrf', 'foo')
          .send({})
          .expect(200);

        expect(afterAuth.body[connectorId].user_auth_status).to.eql('connected');

        await supertestWithoutAuth
          .post(
            `${getUrlPrefix(space.id)}/internal/actions/connector/${connectorId}/_oauth_disconnect`
          )
          .set('Cookie', sessionCookie)
          .set('kbn-xsrf', 'foo')
          .expect(204);
      });
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space: scenarioSpace } = scenario;
      describe(scenario.id, () => {
        it('should handle auth_status request appropriately', async () => {
          const { body: createdConnector } = await supertest
            .post(`${getUrlPrefix(scenarioSpace.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My Connector',
              connector_type_id: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);
          objectRemover.add(scenarioSpace.id, createdConnector.id, 'connector', 'actions');

          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(scenarioSpace.id)}/internal/actions/connectors/_me/auth_status`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({});

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to get actions',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              assertAuthStatusBodyShape(response.body);
              expect(response.body[createdConnector.id].user_auth_status).to.eql('not_applicable');
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
