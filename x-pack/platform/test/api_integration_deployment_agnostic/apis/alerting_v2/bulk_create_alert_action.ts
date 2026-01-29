/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials } from '../../services';
import { createAlertEvent } from './fixtures';

const BULK_ALERT_ACTION_API_PATH = '/internal/alerting/v2/alerts/action/_bulk';
const ALERTS_EVENTS_INDEX = '.alerts-events';
const ALERTS_ACTIONS_INDEX = '.alerts-actions';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');

  describe('Bulk Create Alert Action API', function () {
    let roleAuthc: RoleCredentials;

    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      // Create alert events for two different group hashes
      const alertEvent1 = createAlertEvent({ group_hash: 'group-1', episode_id: 'episode-1' });
      const alertEvent2 = createAlertEvent({ group_hash: 'group-2', episode_id: 'episode-2' });

      await Promise.all([
        esClient.index({
          index: ALERTS_EVENTS_INDEX,
          document: alertEvent1,
          refresh: 'wait_for',
        }),
        esClient.index({
          index: ALERTS_EVENTS_INDEX,
          document: alertEvent2,
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
          index: ALERTS_ACTIONS_INDEX,
          query: { match_all: {} },
          refresh: true,
          wait_for_completion: true,
        }),
      ]);
    });

    afterEach(async () => {
      await esClient.deleteByQuery({
        index: ALERTS_ACTIONS_INDEX,
        query: { match_all: {} },
        refresh: true,
        wait_for_completion: true,
      });
    });

    async function getAllActions() {
      const result = await esClient.search({
        index: ALERTS_ACTIONS_INDEX,
        query: { match_all: {} },
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
      const response = await supertestWithoutAuth
        .post(BULK_ALERT_ACTION_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send([{ group_hash: 'group-1', action_type: 'ack', episode_id: 'episode-1' }]);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ processed: 1, total: 1 });

      const actions = await getAllActions();
      expect(actions.length).to.be(1);
      expect(actions[0].group_hash).to.be('group-1');
      expect(actions[0].action_type).to.be('ack');
    });

    it('should process multiple valid actions and write all documents', async () => {
      const response = await supertestWithoutAuth
        .post(BULK_ALERT_ACTION_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send([
          { group_hash: 'group-1', action_type: 'ack', episode_id: 'episode-1' },
          { group_hash: 'group-2', action_type: 'snooze' },
        ]);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ processed: 2, total: 2 });

      const actions = await getAllActions();
      expect(actions.length).to.be(2);

      const group1Action = actions.find((a) => a.group_hash === 'group-1');
      const group2Action = actions.find((a) => a.group_hash === 'group-2');

      expect(group1Action!.action_type).to.be('ack');
      expect(group2Action!.action_type).to.be('snooze');
    });

    it('should handle mixed valid/invalid group hashes with partial success', async () => {
      const response = await supertestWithoutAuth
        .post(BULK_ALERT_ACTION_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send([
          { group_hash: 'group-1', action_type: 'ack', episode_id: 'episode-1' },
          { group_hash: 'unknown-group', action_type: 'ack', episode_id: 'episode-1' },
          { group_hash: 'group-2', action_type: 'unack', episode_id: 'episode-2' },
        ]);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ processed: 2, total: 3 });

      const actions = await getAllActions();
      expect(actions.length).to.be(2);

      const groupHashes = actions.map((a) => a.group_hash);
      expect(groupHashes).to.contain('group-1');
      expect(groupHashes).to.contain('group-2');
      expect(groupHashes).not.to.contain('unknown-group');
    });

    it('should return processed 0 when all group hashes are invalid', async () => {
      const response = await supertestWithoutAuth
        .post(BULK_ALERT_ACTION_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send([
          { group_hash: 'unknown-1', action_type: 'ack', episode_id: 'episode-1' },
          { group_hash: 'unknown-2', action_type: 'snooze' },
        ]);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ processed: 0, total: 2 });

      const actions = await getAllActions();
      expect(actions.length).to.be(0);
    });

    it('should handle different action types in bulk', async () => {
      const response = await supertestWithoutAuth
        .post(BULK_ALERT_ACTION_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send([
          { group_hash: 'group-1', action_type: 'ack', episode_id: 'episode-1' },
          { group_hash: 'group-1', action_type: 'tag', tags: ['important', 'reviewed'] },
          { group_hash: 'group-2', action_type: 'snooze' },
          { group_hash: 'group-2', action_type: 'activate', reason: 'needs attention' },
        ]);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ processed: 4, total: 4 });

      const actions = await getAllActions();
      expect(actions.length).to.be(4);

      const tagAction = actions.find((a) => a.action_type === 'tag');
      expect(tagAction!.tags).to.eql(['important', 'reviewed']);

      const activateAction = actions.find((a) => a.action_type === 'activate');
      expect(activateAction!.reason).to.be('needs attention');
    });
  });
}
