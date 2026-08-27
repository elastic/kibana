/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type httpProxy from 'http-proxy';
import expect from '@kbn/expect';
import type http from 'http';
import getPort from 'get-port';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';

import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import { getSlackServer } from '@kbn/actions-simulators-plugin/server/plugin';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getEventLog } from '../../../../../common/lib';

export default function slackTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');
  const retry = getService('retry');

  describe('Slack webhook action', () => {
    let simulatedActionId = '';
    let slackSimulatorURL: string = '';
    let slackServer: http.Server;
    let proxyServer: httpProxy | undefined;
    let proxyHaveBeenCalled = false;

    // need to wait for kibanaServer to settle ...
    before(async () => {
      slackServer = await getSlackServer();
      const availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      if (!slackServer.listening) {
        slackServer.listen(availablePort);
      }
      slackSimulatorURL = `http://localhost:${availablePort}`;
      proxyServer = await getHttpProxyServer(
        slackSimulatorURL,
        configService.get('kbnTestServer.serverArgs'),
        () => {
          proxyHaveBeenCalled = true;
        }
      );
    });

    it('should return 200 when creating a Slack V2 webhook connector successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack action',
          connector_type_id: '.slack2',
          config: {},
          secrets: {
            authType: 'webhook',
            webhookUrl: slackSimulatorURL,
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        is_missing_secrets: false,
        name: 'A slack action',
        connector_type_id: '.slack2',
        config: { authType: 'webhook' },
        is_connector_type_deprecated: false,
        auth_mode: 'shared',
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/connector/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        is_missing_secrets: false,
        name: 'A slack action',
        connector_type_id: '.slack2',
        config: { authType: 'webhook' },
        is_connector_type_deprecated: false,
        auth_mode: 'shared',
      });
    });

    it('should reject creating a V1 Slack webhook connector', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack action',
          connector_type_id: '.slack',
          config: {},
          secrets: {
            webhookUrl: slackSimulatorURL,
          },
        })
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: 'New connectors of action type .slack cannot be created.',
        });
    });

    it('should create our slack simulator action successfully', async () => {
      const { body: createdSimulatedAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack simulator',
          connector_type_id: '.slack2',
          config: {},
          secrets: {
            authType: 'webhook',
            webhookUrl: slackSimulatorURL,
          },
        })
        .expect(200);

      simulatedActionId = createdSimulatedAction.id;
    });

    it('should handle firing with a simulated success', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            subAction: 'sendMessage',
            subActionParams: {
              text: 'success',
            },
          },
        })
        .expect(200);
      expect(result.status).to.eql('ok');
      expect(proxyHaveBeenCalled).to.equal(true);

      const events: IValidatedEvent[] = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'default',
          type: 'action',
          id: simulatedActionId,
          provider: 'actions',
          actions: new Map([
            ['execute-start', { gte: 1 }],
            ['execute', { gte: 1 }],
          ]),
        });
      });

      const executeEvent = events.find((e) => e?.event?.action === 'execute');
      expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(0);
    });

    it('should handle an empty message error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            subAction: 'sendMessage',
            subActionParams: {
              text: '',
            },
          },
        })
        .expect(200);
      expect(result.status).to.eql('error');
      expect(result.message).to.eql(
        `error validating action params: ✖ Too small: expected string to have >=1 characters\n  → at subActionParams.text`
      );
    });

    it('should handle a 40x slack error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            subAction: 'sendMessage',
            subActionParams: {
              text: 'invalid_payload',
            },
          },
        })
        .expect(200);
      expect(result.status).to.equal('error');
      expect(result.message).to.equal('Request failed with status code 400');
    });

    it('should retry and report a 429 slack error', async () => {
      const dateStart = new Date().getTime();
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            subAction: 'sendMessage',
            subActionParams: {
              text: 'rate_limit',
            },
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.equal('Request failed with status code 429');
      expect(new Date().getTime() - dateStart).to.be.greaterThan(5000);
    });

    it('should handle a 500 slack error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            subAction: 'sendMessage',
            subActionParams: {
              text: 'status_500',
            },
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.equal('Request failed with status code 500');
    });

    after(() => {
      slackServer.close();
      if (proxyServer) {
        proxyServer.close();
      }
    });
  });
}
