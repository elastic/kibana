/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials } from '../../services';
import { createAlertEvent, indexAlertEvents } from './fixtures';

const ALERT_ACTION_API_PATH = '/internal/alerting/v2/alerts';
const ALERTING_EVENTS_INDEX = '.alerting-events';
const ALERTING_ACTIONS_INDEX = '.alerting-actions';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');

  describe('Create Alert Action API', function () {
    this.tags(['skipServerless']);
    let roleAuthc: RoleCredentials;

    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      await Promise.all([
        esClient.deleteByQuery(
          {
            index: ALERTING_EVENTS_INDEX,
            query: { match_all: {} },
            refresh: true,
            wait_for_completion: true,
            conflicts: 'proceed',
          },
          { ignore: [404] }
        ),
        esClient.deleteByQuery(
          {
            index: ALERTING_ACTIONS_INDEX,
            query: { match_all: {} },
            refresh: true,
            wait_for_completion: true,
            conflicts: 'proceed',
          },
          { ignore: [404] }
        ),
      ]);
    });

    async function getLatestAction(ruleIds: string[]) {
      await esClient.indices.refresh({ index: ALERTING_ACTIONS_INDEX });
      const result = await esClient.search({
        index: ALERTING_ACTIONS_INDEX,
        query: {
          bool: {
            must_not: [{ terms: { action_type: ['fire', 'suppress'] } }],
            filter: [{ terms: { rule_id: ruleIds } }],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
        size: 1,
      });
      return result.hits.hits[0]?._source as Record<string, unknown> | undefined;
    }

    it('should return 204 for ack action and write action document', async () => {
      const ruleId = 'ack-test-rule';
      const groupHash = 'ack-test-group';
      const episodeId = 'ack-test-episode';
      const event = createAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        episode: { id: episodeId, status: 'active' },
      });
      await indexAlertEvents(esClient, [event]);

      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/${groupHash}/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'ack', episode_id: episodeId });

      expect(response.status).to.be(204);

      const action = await getLatestAction([ruleId]);
      expect(action).to.be.ok();
      expect(action!.group_hash).to.be(groupHash);
      expect(action!.action_type).to.be('ack');
      expect(action!.episode_id).to.be(episodeId);
      expect(action!.rule_id).to.be(ruleId);
      expect(action!.last_series_event_timestamp).to.be(event['@timestamp']);
    });

    it('should return 204 for unack action and write action document', async () => {
      const ruleId = 'unack-test-rule';
      const groupHash = 'unack-test-group';
      const episodeId = 'unack-test-episode';
      const event = createAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        episode: { id: episodeId, status: 'active' },
      });
      await indexAlertEvents(esClient, [event]);

      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/${groupHash}/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'unack', episode_id: episodeId });

      expect(response.status).to.be(204);

      const action = await getLatestAction([ruleId]);
      expect(action).to.be.ok();
      expect(action!.group_hash).to.be(groupHash);
      expect(action!.action_type).to.be('unack');
      expect(action!.episode_id).to.be(episodeId);
    });

    it('should return 204 for tag action with tags and write action document', async () => {
      const ruleId = 'tag-test-rule';
      const groupHash = 'tag-test-group';
      const event = createAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        episode: { id: 'tag-test-episode', status: 'active' },
      });
      await indexAlertEvents(esClient, [event]);

      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/${groupHash}/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'tag', tags: ['tag1', 'tag2'] });

      expect(response.status).to.be(204);

      const action = await getLatestAction([ruleId]);
      expect(action).to.be.ok();
      expect(action!.group_hash).to.be(groupHash);
      expect(action!.action_type).to.be('tag');
      expect(action!.tags).to.eql(['tag1', 'tag2']);
    });

    it('should return 400 for tag action without tags', async () => {
      const groupHash = 'tag-no-tags-test-group';
      const event = createAlertEvent({
        rule: { id: 'tag-no-tags-test-rule', version: 1 },
        group_hash: groupHash,
        episode: { id: 'tag-no-tags-test-episode', status: 'active' },
      });
      await indexAlertEvents(esClient, [event]);

      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/${groupHash}/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'tag' });

      expect(response.status).to.be(400);
    });

    it('should return 204 for untag action with tags and write action document', async () => {
      const ruleId = 'untag-test-rule';
      const groupHash = 'untag-test-group';
      const event = createAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        episode: { id: 'untag-test-episode', status: 'active' },
      });
      await indexAlertEvents(esClient, [event]);

      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/${groupHash}/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'untag', tags: ['tag1'] });

      expect(response.status).to.be(204);

      const action = await getLatestAction([ruleId]);
      expect(action).to.be.ok();
      expect(action!.group_hash).to.be(groupHash);
      expect(action!.action_type).to.be('untag');
      expect(action!.tags).to.eql(['tag1']);
    });

    it('should return 204 for snooze action and write action document', async () => {
      const ruleId = 'snooze-test-rule';
      const groupHash = 'snooze-test-group';
      const event = createAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        episode: { id: 'snooze-test-episode', status: 'active' },
      });
      await indexAlertEvents(esClient, [event]);

      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/${groupHash}/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'snooze' });

      expect(response.status).to.be(204);

      const action = await getLatestAction([ruleId]);
      expect(action).to.be.ok();
      expect(action!.group_hash).to.be(groupHash);
      expect(action!.action_type).to.be('snooze');
    });

    it('should return 204 for unsnooze action and write action document', async () => {
      const ruleId = 'unsnooze-test-rule';
      const groupHash = 'unsnooze-test-group';
      const event = createAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        episode: { id: 'unsnooze-test-episode', status: 'active' },
      });
      await indexAlertEvents(esClient, [event]);

      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/${groupHash}/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'unsnooze' });

      expect(response.status).to.be(204);

      const action = await getLatestAction([ruleId]);
      expect(action).to.be.ok();
      expect(action!.group_hash).to.be(groupHash);
      expect(action!.action_type).to.be('unsnooze');
    });

    it('should return 204 for activate action with reason and write action document', async () => {
      const ruleId = 'activate-test-rule';
      const groupHash = 'activate-test-group';
      const event = createAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        episode: { id: 'activate-test-episode', status: 'active' },
      });
      await indexAlertEvents(esClient, [event]);

      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/${groupHash}/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'activate', reason: 'test reason' });

      expect(response.status).to.be(204);

      const action = await getLatestAction([ruleId]);
      expect(action).to.be.ok();
      expect(action!.group_hash).to.be(groupHash);
      expect(action!.action_type).to.be('activate');
      expect(action!.reason).to.be('test reason');
    });

    it('should return 400 for activate action without reason', async () => {
      const groupHash = 'activate-no-reason-test-group';
      const event = createAlertEvent({
        rule: { id: 'activate-no-reason-test-rule', version: 1 },
        group_hash: groupHash,
        episode: { id: 'activate-no-reason-test-episode', status: 'active' },
      });
      await indexAlertEvents(esClient, [event]);

      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/${groupHash}/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'activate' });

      expect(response.status).to.be(400);
    });

    it('should return 204 for deactivate action with reason and write action document', async () => {
      const ruleId = 'deactivate-test-rule';
      const groupHash = 'deactivate-test-group';
      const event = createAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        episode: { id: 'deactivate-test-episode', status: 'active' },
      });
      await indexAlertEvents(esClient, [event]);

      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/${groupHash}/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'deactivate', reason: 'test reason' });

      expect(response.status).to.be(204);

      const action = await getLatestAction([ruleId]);
      expect(action).to.be.ok();
      expect(action!.group_hash).to.be(groupHash);
      expect(action!.action_type).to.be('deactivate');
      expect(action!.reason).to.be('test reason');
    });

    it('should return 400 for deactivate action without reason', async () => {
      const groupHash = 'deactivate-no-reason-test-group';
      const event = createAlertEvent({
        rule: { id: 'deactivate-no-reason-test-rule', version: 1 },
        group_hash: groupHash,
        episode: { id: 'deactivate-no-reason-test-episode', status: 'active' },
      });
      await indexAlertEvents(esClient, [event]);

      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/${groupHash}/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'deactivate' });

      expect(response.status).to.be(400);
    });

    it('should return 404 for unknown group hash', async () => {
      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/unknown-group-hash/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'ack', episode_id: 'unknown-episode' });

      expect(response.status).to.be(404);
    });

    it('should filter by episode_id when provided in request body', async () => {
      const ruleId = 'episode-filter-test-rule';
      const groupHash = 'episode-filter-test-group';
      const olderEpisodeId = 'episode-filter-older';
      const newerEpisodeId = 'episode-filter-newer';

      const olderEvent = createAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        episode: { id: olderEpisodeId, status: 'active' },
        '@timestamp': '2024-01-01T00:00:00.000Z',
      });
      const newerEvent = createAlertEvent({
        rule: { id: ruleId, version: 1 },
        group_hash: groupHash,
        episode: { id: newerEpisodeId, status: 'active' },
        '@timestamp': '2024-01-02T00:00:00.000Z',
      });
      await indexAlertEvents(esClient, [olderEvent, newerEvent]);

      const response = await supertestWithoutAuth
        .post(`${ALERT_ACTION_API_PATH}/${groupHash}/action`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ action_type: 'ack', episode_id: olderEpisodeId });

      expect(response.status).to.be(204);

      const action = await getLatestAction([ruleId]);
      expect(action).to.be.ok();
      expect(action!.group_hash).to.be(groupHash);
      expect(action!.action_type).to.be('ack');
      expect(action!.episode_id).to.be(olderEpisodeId);
      expect(action!.last_series_event_timestamp).to.be(olderEvent['@timestamp']);
    });
  });
}
