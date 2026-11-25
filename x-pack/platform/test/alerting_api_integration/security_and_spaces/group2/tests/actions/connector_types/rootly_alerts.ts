/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type httpProxy from 'http-proxy';
import expect from '@kbn/expect';

import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '@kbn/actions-simulators-plugin/server/plugin';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

export default function rootlyAlertsTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  describe('rootly alerts action', () => {
    let simulatedActionId = '';
    let webhookUrl: string = '<could not determine kibana url>';
    let proxyServer: httpProxy | undefined;
    let proxyHaveBeenCalled = false;

    before(async () => {
      webhookUrl = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.ROOTLY_ALERTS)
      );

      proxyServer = await getHttpProxyServer(
        kibanaServer.resolveUrl('/'),
        configService.get('kbnTestServer.serverArgs'),
        () => {
          proxyHaveBeenCalled = true;
        }
      );
    });

    const execute = async (params: Record<string, unknown>) => {
      const { body } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({ params })
        .expect(200);
      return body;
    };

    it('should return successfully when passed valid create parameters', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A rootly alerts action',
          connector_type_id: '.rootly_alerts',
          config: {
            webhookUrl,
          },
          secrets: {
            secret: 'rootly-alerts-secret',
          },
        })
        .expect(200);

      simulatedActionId = createdAction.id;

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        is_system_action: false,
        is_deprecated: false,
        name: 'A rootly alerts action',
        connector_type_id: '.rootly_alerts',
        is_missing_secrets: false,
        config: {
          webhookUrl,
        },
        is_connector_type_deprecated: false,
      });
    });

    it('should return unsuccessfully when passed invalid create parameters', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A rootly alerts action',
          connector_type_id: '.rootly_alerts',
          config: {
            webhookUrl,
          },
          secrets: {},
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body.message).to.match(/^error validating connector type secrets:/);
        });
    });

    it('should return unsuccessfully when the webhook URL includes the secret', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A rootly alerts action',
          connector_type_id: '.rootly_alerts',
          config: {
            webhookUrl: `${webhookUrl}?secret=rootly-alerts-secret`,
          },
          secrets: {
            secret: 'rootly-alerts-secret',
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating connector type config: error configuring rootly alerts action: webhookUrl must not include the secret',
          });
        });
    });

    it('should return unsuccessfully when the webhook URL is not present in allowedHosts', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A rootly alerts action',
          connector_type_id: '.rootly_alerts',
          config: {
            webhookUrl: 'https://rootly.mynonexistent.com/webhooks',
          },
          secrets: {
            secret: 'rootly-alerts-secret',
          },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating connector type config: error configuring rootly alerts action: target url "https://rootly.mynonexistent.com/webhooks" is not added to the Kibana config xpack.actions.allowedHosts',
          });
        });
    });

    it('should handle executing with a simulated success', async () => {
      const result = await execute({
        event: 'trigger',
        dedupKey: 'rule-id:alert-id',
        title: 'just a test',
        match: { on: 'service', value: 'checkout-api' },
      });

      expect(proxyHaveBeenCalled).to.equal(true);
      expect(result).to.eql({
        status: 'ok',
        connector_id: simulatedActionId,
        data: { dedupKey: 'rule-id:alert-id' },
      });
    });

    it('should generate a dedupKey when a trigger has none', async () => {
      const result = await execute({ title: 'just a test' });

      expect(result.status).to.eql('ok');
      expect(result.data.dedupKey).to.match(/^[0-9a-f-]{36}$/);
    });

    it('should handle resolving with a simulated success', async () => {
      const result = await execute({ event: 'resolve', dedupKey: 'rule-id:alert-id' });

      expect(result).to.eql({
        status: 'ok',
        connector_id: simulatedActionId,
        data: { dedupKey: 'rule-id:alert-id' },
      });
    });

    it('should send a target in place of the routing value', async () => {
      const result = await execute({
        event: 'trigger',
        dedupKey: 'rule-id:alert-id',
        title: 'expect-a-target',
        match: { on: 'service', value: 'checkout-api' },
        target: { type: 'escalation_policy', id: 'known-target-id' },
      });

      expect(result.status).to.eql('ok');
    });

    it('should fail when a target has no ID', async () => {
      const result = await execute({ title: 'just a test', target: { type: 'service' } });

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/Target ID is required when a target is set/);
    });

    it('should handle a 400 rootly alerts error for an unknown target', async () => {
      const result = await execute({
        title: 'just a test',
        target: { type: 'escalation_policy', id: 'unknown-target-id' },
      });

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error posting rootly alerts event: unexpected status 400/);
      expect(result.service_message).to.eql('notification target is invalid or not accessible');
      expect(result.retry).to.not.be.ok();
    });

    it('should use the rule and alert IDs when a trigger from a rule has no dedupKey', async () => {
      const result = await execute({
        title: 'just a test',
        ruleId: 'rule-id',
        alertId: 'alert-id',
      });

      expect(result.data.dedupKey).to.eql('rule-id:alert-id');
    });

    it('should handle a 404 rootly alerts error', async () => {
      const result = await execute({ event: 'trigger', title: 'respond-with-404' });

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error posting rootly alerts event: unexpected status 404/);
      expect(result.service_message).to.eql('integration cannot be found');
    });

    it('should handle a 429 rootly alerts error', async () => {
      const before = Date.now();
      const result = await execute({ event: 'trigger', title: 'respond-with-429' });
      const after = Date.now();

      expect(result.status).to.equal('error');
      expect(result.message).to.match(
        /error posting rootly alerts event: http status 429, retry later/
      );

      // the simulator responds with a retry-after header of 30 seconds
      const retryAt = Date.parse(result.retry);
      expect(retryAt).to.be.greaterThan(before + 29000);
      expect(retryAt).to.be.lessThan(after + 31000);
    });

    it('should handle a 502 rootly alerts error', async () => {
      const result = await execute({ event: 'trigger', title: 'respond-with-502' });

      expect(result.status).to.equal('error');
      expect(result.message).to.match(
        /error posting rootly alerts event: http status 502, retry later/
      );
      expect(result.retry).to.equal(true);
    });

    after(() => {
      if (proxyServer) {
        proxyServer.close();
      }
    });
  });
}
