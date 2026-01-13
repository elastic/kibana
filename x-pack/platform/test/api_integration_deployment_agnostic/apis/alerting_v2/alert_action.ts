/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials } from '../../services';

const ALERT_ACTION_API_PATH = '/internal/alerting/v2/alerts';
const ALERTS_DATA_STREAM = '.alerts-events';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');

  describe('Alert Action API', function () {
    let roleAuthc: RoleCredentials;

    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      await esClient.index({
        index: ALERTS_DATA_STREAM,
        document: {
          '@timestamp': new Date().toISOString(),
          scheduled_timestamp: new Date().toISOString(),
          rule: {
            id: 'test-rule-id',
            tags: ['rule-tag-1', 'rule-tag-2'],
          },
          grouping: {
            key: 'host.name',
            value: 'test-host',
          },
          data: { custom_field: 'custom_value' },
          parent_rule_id: 'test-parent-rule-id',
          status: 'active',
          alert_id: 'test-alert-id',
          alert_series_id: 'test-alert-series-id',
          source: 'test-source',
          tags: ['alert-tag-1', 'alert-tag-2'],
        },
        refresh: 'wait_for',
      });
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      await esClient.deleteByQuery({
        index: ALERTS_DATA_STREAM,
        query: {
          match_all: {},
        },
        refresh: true,
        wait_for_completion: true,
      });
    });

    it('should return 200 for ack action', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'ack' });

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('message', 'not implemented yet');
    });

    it('should return 200 for unack action', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'unack' });

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('message', 'not implemented yet');
    });

    it('should return 200 for tag action with tags', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'tag', tags: ['tag1', 'tag2'] });

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('message', 'not implemented yet');
    });

    it('should return 400 for tag action without tags', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'tag' });

      expect(response.status).to.be(400);
    });

    it('should return 200 for untag action with tags', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'untag', tags: ['tag1'] });

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('message', 'not implemented yet');
    });

    it('should return 200 for snooze action', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'snooze' });

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('message', 'not implemented yet');
    });

    it('should return 200 for unsnooze action', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'unsnooze' });

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('message', 'not implemented yet');
    });

    it('should return 200 for set_severity action with sev_level', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'set_severity', sev_level: 1 });

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('message', 'not implemented yet');
    });

    it('should return 400 for set_severity action without sev_level', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'set_severity' });

      expect(response.status).to.be(400);
    });

    it('should return 200 for clear_severity action', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'clear_severity' });

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('message', 'not implemented yet');
    });

    it('should return 200 for activate action with reason', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'activate', reason: 'test reason' });

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('message', 'not implemented yet');
    });

    it('should return 400 for activate action without reason', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'activate' });

      expect(response.status).to.be(400);
    });

    it('should return 200 for deactivate action with reason', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'deactivate', reason: 'test reason' });

      expect(response.status).to.be(200);
      expect(response.body).to.have.property('message', 'not implemented yet');
    });

    it('should return 400 for deactivate action without reason', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'deactivate' });

      expect(response.status).to.be(400);
    });

    it('should return 404 for unknown alert_series_id', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/unknown-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'ack' });

      expect(response.status).to.be(404);
    });
  });
}
