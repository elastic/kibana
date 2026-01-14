/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials } from '../../services';
import { createAlertEvent, createAlertTransition } from './fixtures';

const ALERT_ACTION_API_PATH = '/internal/alerting/v2/alerts';
const ALERTS_EVENTS_INDEX = '.alerts-events';
const ALERTS_TRANSITIONS_INDEX = '.alerts-transitions';
const ALERTS_ACTIONS_INDEX = '.alerts-actions';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');

  describe('Alert Action API', function () {
    let roleAuthc: RoleCredentials;
    let alertEvent: ReturnType<typeof createAlertEvent>;
    let alertTransition: ReturnType<typeof createAlertTransition>;

    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      alertEvent = createAlertEvent();
      alertTransition = createAlertTransition();

      await Promise.all([
        esClient.index({
          index: ALERTS_EVENTS_INDEX,
          document: alertEvent,
          refresh: 'wait_for',
        }),
        esClient.index({
          index: ALERTS_TRANSITIONS_INDEX,
          document: alertTransition,
          refresh: 'wait_for',
        }),
      ]);
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      await Promise.all([
        esClient.deleteByQuery({
          index: ALERTS_EVENTS_INDEX,
          query: { match_all: {} },
          refresh: true,
          wait_for_completion: true,
        }),
        esClient.deleteByQuery({
          index: ALERTS_TRANSITIONS_INDEX,
          query: { match_all: {} },
          refresh: true,
          wait_for_completion: true,
        }),
        esClient.deleteByQuery({
          index: ALERTS_ACTIONS_INDEX,
          query: { match_all: {} },
          refresh: true,
          wait_for_completion: true,
        }),
      ]);
    });

    afterEach(async () => {
      // Clean up actions after each test
      await esClient.deleteByQuery({
        index: ALERTS_ACTIONS_INDEX,
        query: { match_all: {} },
        refresh: true,
        wait_for_completion: true,
      });
    });

    async function getLatestAction() {
      const result = await esClient.search({
        index: ALERTS_ACTIONS_INDEX,
        query: { match_all: {} },
        sort: [{ '@timestamp': 'desc' }],
        size: 1,
      });
      return result.hits.hits[0]?._source as Record<string, unknown> | undefined;
    }

    it('should return 204 for ack action and write action document', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'ack' });

      expect(response.status).to.be(204);

      const action = await getLatestAction();
      expect(action).to.be.ok();
      expect(action!.alert_series_id).to.be('test-alert-series-id');
      expect(action!.action_type).to.be('ack');
      expect(action!.episode_id).to.be(alertTransition.episode_id);
      expect(action!.rule_id).to.be(alertEvent['rule.id']);
      expect(action!.last_series_event_timestamp).to.be(alertEvent['@timestamp']);
    });

    it('should return 204 for unack action and write action document', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'unack' });

      expect(response.status).to.be(204);

      const action = await getLatestAction();
      expect(action).to.be.ok();
      expect(action!.alert_series_id).to.be('test-alert-series-id');
      expect(action!.action_type).to.be('unack');
      expect(action!.episode_id).to.be(alertTransition.episode_id);
    });

    it('should return 204 for tag action with tags and write action document', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'tag', tags: ['tag1', 'tag2'] });

      expect(response.status).to.be(204);

      const action = await getLatestAction();
      expect(action).to.be.ok();
      expect(action!.alert_series_id).to.be('test-alert-series-id');
      expect(action!.action_type).to.be('tag');
      expect(action!.tags).to.eql(['tag1', 'tag2']);
    });

    it('should return 400 for tag action without tags', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'tag' });

      expect(response.status).to.be(400);
    });

    it('should return 204 for untag action with tags and write action document', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'untag', tags: ['tag1'] });

      expect(response.status).to.be(204);

      const action = await getLatestAction();
      expect(action).to.be.ok();
      expect(action!.alert_series_id).to.be('test-alert-series-id');
      expect(action!.action_type).to.be('untag');
      expect(action!.tags).to.eql(['tag1']);
    });

    it('should return 204 for snooze action and write action document', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'snooze' });

      expect(response.status).to.be(204);

      const action = await getLatestAction();
      expect(action).to.be.ok();
      expect(action!.alert_series_id).to.be('test-alert-series-id');
      expect(action!.action_type).to.be('snooze');
    });

    it('should return 204 for unsnooze action and write action document', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'unsnooze' });

      expect(response.status).to.be(204);

      const action = await getLatestAction();
      expect(action).to.be.ok();
      expect(action!.alert_series_id).to.be('test-alert-series-id');
      expect(action!.action_type).to.be('unsnooze');
    });

    it('should return 204 for activate action with reason and write action document', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'activate', reason: 'test reason' });

      expect(response.status).to.be(204);

      const action = await getLatestAction();
      expect(action).to.be.ok();
      expect(action!.alert_series_id).to.be('test-alert-series-id');
      expect(action!.action_type).to.be('activate');
      expect(action!.reason).to.be('test reason');
    });

    it('should return 400 for activate action without reason', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'activate' });

      expect(response.status).to.be(400);
    });

    it('should return 204 for deactivate action with reason and write action document', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'deactivate', reason: 'test reason' });

      expect(response.status).to.be(204);

      const action = await getLatestAction();
      expect(action).to.be.ok();
      expect(action!.alert_series_id).to.be('test-alert-series-id');
      expect(action!.action_type).to.be('deactivate');
      expect(action!.reason).to.be('test reason');
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

    it('should filter by episode_id when provided in request body', async () => {
      const secondTransition = createAlertTransition({ episode_id: 'second-episode-id' });
      await esClient.index({
        index: ALERTS_TRANSITIONS_INDEX,
        document: secondTransition,
        refresh: 'wait_for',
      });

      // Send action with specific episode_id (from the first transition)
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/test-alert-series-id/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'ack', episode_id: 'test-episode-id' });

      expect(response.status).to.be(204);

      const action = await getLatestAction();
      expect(action).to.be.ok();
      expect(action!.alert_series_id).to.be('test-alert-series-id');
      expect(action!.action_type).to.be('ack');
      // Verify the action uses the episode_id from the first transition, not the second latest one
      expect(action!.episode_id).to.be('test-episode-id');
    });
  });
}
