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

const BULK_ALERT_ACTION_API_PATH = '/internal/alerting/v2/alerts/action/_bulk';
const ALERTING_EVENTS_INDEX = '.rule-events';
const ALERTING_ACTIONS_INDEX = '.alert-actions';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');

  describe('Bulk Create Alert Action API', function () {
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

    async function getAllActions(ruleIds: string[]) {
      await esClient.indices.refresh({ index: ALERTING_ACTIONS_INDEX });
      const result = await esClient.search({
        index: ALERTING_ACTIONS_INDEX,
        query: {
          bool: {
            must_not: [{ terms: { action_type: ['fire', 'suppress'] } }],
            filter: [{ terms: { rule_id: ruleIds } }],
          },
        },
        sort: [{ '@timestamp': 'asc' }],
        size: 100,
      });
      return result.hits.hits.map((hit) => hit._source as Record<string, unknown>);
    }

    it('should return 400 for empty array', async () => {
      const response = await supertestWithoutAuth
        .post(BULK_ALERT_ACTION_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send([]);

      expect(response.status).to.be(400);
    });

    it('should process single valid action and return counts', async () => {
      const ruleId = 'bulk-single-rule';
      const groupHash = 'bulk-single-group';
      const episodeId = 'bulk-single-episode';
      await indexAlertEvents(esClient, [
        createAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash,
          episode: { id: episodeId, status: 'active' },
        }),
      ]);

      const response = await supertestWithoutAuth
        .post(BULK_ALERT_ACTION_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send([{ group_hash: groupHash, action_type: 'ack', episode_id: episodeId }]);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ processed: 1, total: 1 });

      const actions = await getAllActions([ruleId]);
      expect(actions.length).to.be(1);
      expect(actions[0].group_hash).to.be(groupHash);
      expect(actions[0].action_type).to.be('ack');
    });

    it('should process multiple valid actions and write all documents', async () => {
      const ruleId = 'bulk-multi-rule';
      const groupHash1 = 'bulk-multi-group-1';
      const groupHash2 = 'bulk-multi-group-2';
      const episodeId1 = 'bulk-multi-episode-1';
      const episodeId2 = 'bulk-multi-episode-2';
      await indexAlertEvents(esClient, [
        createAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash1,
          episode: { id: episodeId1, status: 'active' },
        }),
        createAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash2,
          episode: { id: episodeId2, status: 'active' },
        }),
      ]);

      const response = await supertestWithoutAuth
        .post(BULK_ALERT_ACTION_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send([
          { group_hash: groupHash1, action_type: 'ack', episode_id: episodeId1 },
          { group_hash: groupHash2, action_type: 'snooze' },
        ]);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ processed: 2, total: 2 });

      const actions = await getAllActions([ruleId]);
      expect(actions.length).to.be(2);

      const group1Action = actions.find((a) => a.group_hash === groupHash1);
      const group2Action = actions.find((a) => a.group_hash === groupHash2);

      expect(group1Action!.action_type).to.be('ack');
      expect(group2Action!.action_type).to.be('snooze');
    });

    it('should handle mixed valid/invalid group hashes with partial success', async () => {
      const ruleId = 'bulk-mixed-rule';
      const groupHash1 = 'bulk-mixed-group-1';
      const groupHash2 = 'bulk-mixed-group-2';
      const episodeId1 = 'bulk-mixed-episode-1';
      const episodeId2 = 'bulk-mixed-episode-2';
      await indexAlertEvents(esClient, [
        createAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash1,
          episode: { id: episodeId1, status: 'active' },
        }),
        createAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash2,
          episode: { id: episodeId2, status: 'active' },
        }),
      ]);

      const response = await supertestWithoutAuth
        .post(BULK_ALERT_ACTION_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send([
          { group_hash: groupHash1, action_type: 'ack', episode_id: episodeId1 },
          {
            group_hash: 'bulk-mixed-unknown-group',
            action_type: 'ack',
            episode_id: 'bulk-mixed-unknown-episode',
          },
          { group_hash: groupHash2, action_type: 'unack', episode_id: episodeId2 },
        ]);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ processed: 2, total: 3 });

      const actions = await getAllActions([ruleId]);
      expect(actions.length).to.be(2);

      const groupHashes = actions.map((a) => a.group_hash);
      expect(groupHashes).to.contain(groupHash1);
      expect(groupHashes).to.contain(groupHash2);
      expect(groupHashes).not.to.contain('bulk-mixed-unknown-group');
    });

    it('should return processed 0 when all group hashes are invalid', async () => {
      const ruleId = 'bulk-invalid-rule';

      const response = await supertestWithoutAuth
        .post(BULK_ALERT_ACTION_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send([
          {
            group_hash: 'bulk-invalid-unknown-1',
            action_type: 'ack',
            episode_id: 'bulk-invalid-unknown-episode-1',
          },
          { group_hash: 'bulk-invalid-unknown-2', action_type: 'snooze' },
        ]);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ processed: 0, total: 2 });

      const actions = await getAllActions([ruleId]);
      expect(actions.length).to.be(0);
    });

    it('should handle different action types in bulk', async () => {
      const ruleId = 'bulk-types-rule';
      const groupHash1 = 'bulk-types-group-1';
      const groupHash2 = 'bulk-types-group-2';
      const episodeId1 = 'bulk-types-episode-1';
      const episodeId2 = 'bulk-types-episode-2';
      await indexAlertEvents(esClient, [
        createAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash1,
          episode: { id: episodeId1, status: 'active' },
        }),
        createAlertEvent({
          rule: { id: ruleId, version: 1 },
          group_hash: groupHash2,
          episode: { id: episodeId2, status: 'active' },
        }),
      ]);

      const response = await supertestWithoutAuth
        .post(BULK_ALERT_ACTION_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send([
          { group_hash: groupHash1, action_type: 'ack', episode_id: episodeId1 },
          { group_hash: groupHash1, action_type: 'tag', tags: ['important', 'reviewed'] },
          { group_hash: groupHash2, action_type: 'snooze' },
          { group_hash: groupHash2, action_type: 'activate', reason: 'needs attention' },
        ]);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ processed: 4, total: 4 });

      const actions = await getAllActions([ruleId]);
      expect(actions.length).to.be(4);

      const tagAction = actions.find((a) => a.action_type === 'tag');
      expect(tagAction!.tags).to.eql(['important', 'reviewed']);

      const activateAction = actions.find((a) => a.action_type === 'activate');
      expect(activateAction!.reason).to.be('needs attention');
    });
  });
}
