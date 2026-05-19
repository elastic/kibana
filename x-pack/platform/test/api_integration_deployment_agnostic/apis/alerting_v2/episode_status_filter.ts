/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  buildEpisodesQuery,
  type EpisodesFilterState,
} from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials } from '../../services';
import { createAlertEvent, indexAlertEvents } from './fixtures';

const BULK_ALERT_ACTION_API_PATH = '/api/alerting/v2/alerts/_bulk_action';
const ALERTING_EVENTS_INDEX = '.rule-events';
const ALERTING_ACTIONS_INDEX = '.alert-actions';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');

  describe('Episode Status Filter with Deactivated Episodes', function () {
    this.tags(['skipServerless']);
    let roleAuthc: RoleCredentials;

    const RULE_A = 'filter-test-rule-a';
    const RULE_B = 'filter-test-rule-b';

    const GROUP_1 = 'filter-test-group-1';
    const GROUP_2 = 'filter-test-group-2';
    const GROUP_3 = 'filter-test-group-3';
    const GROUP_4 = 'filter-test-group-4';
    const GROUP_5 = 'filter-test-group-5';

    const EPISODE_1 = 'filter-test-episode-1';
    const EPISODE_2 = 'filter-test-episode-2';
    const EPISODE_3 = 'filter-test-episode-3';
    const EPISODE_4 = 'filter-test-episode-4';
    const EPISODE_5 = 'filter-test-episode-5';

    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      await indexAlertEvents(esClient, [
        createAlertEvent({
          rule: { id: RULE_A, version: 1 },
          group_hash: GROUP_1,
          episode: { id: EPISODE_1, status: 'active' },
        }),
        createAlertEvent({
          rule: { id: RULE_A, version: 1 },
          group_hash: GROUP_2,
          episode: { id: EPISODE_2, status: 'active' },
        }),
        createAlertEvent({
          rule: { id: RULE_B, version: 1 },
          group_hash: GROUP_3,
          episode: { id: EPISODE_3, status: 'inactive' },
        }),
        createAlertEvent({
          rule: { id: RULE_B, version: 1 },
          group_hash: GROUP_4,
          episode: { id: EPISODE_4, status: 'pending' },
        }),
        createAlertEvent({
          rule: { id: RULE_A, version: 1 },
          group_hash: GROUP_5,
          episode: { id: EPISODE_5, status: 'recovering' },
        }),
      ]);

      const response = await supertestWithoutAuth
        .post(BULK_ALERT_ACTION_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send([
          { group_hash: GROUP_1, action_type: 'deactivate', reason: 'resolved by test setup' },
          { group_hash: GROUP_4, action_type: 'deactivate', reason: 'resolved by test setup' },
        ]);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ processed: 2, total: 2 });
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

    async function fetchEpisodesWithFilter(
      filterState: EpisodesFilterState
    ): Promise<Array<Record<string, unknown>>> {
      const esqlQuery = buildEpisodesQuery(
        { sortField: '@timestamp', sortDirection: 'desc' },
        filterState
      );
      const queryString = esqlQuery.print('basic').replace('?pageSize', '1000');
      const result = await esClient.esql.query({ query: queryString });
      const columns = result.columns ?? [];
      return (result.values ?? []).map((row) => {
        const record: Record<string, unknown> = {};
        columns.forEach((col, idx) => {
          record[col.name] = row[idx];
        });
        return record;
      });
    }

    it('should exclude deactivated episodes when filtering by active', async () => {
      const episodes = await fetchEpisodesWithFilter({ status: 'active' });

      const groupHashes = episodes.map((e) => e.group_hash);
      expect(groupHashes).to.contain(GROUP_2);
      expect(groupHashes).not.to.contain(GROUP_1);
    });

    it('should include deactivated episodes when filtering by inactive', async () => {
      const episodes = await fetchEpisodesWithFilter({ status: 'inactive' });

      const groupHashes = episodes.map((e) => e.group_hash);
      expect(groupHashes).to.contain(GROUP_3);
      expect(groupHashes).to.contain(GROUP_1);
      expect(groupHashes).to.contain(GROUP_4);
    });

    it('should exclude deactivated episodes when filtering by pending', async () => {
      const episodes = await fetchEpisodesWithFilter({ status: 'pending' });

      const groupHashes = episodes.map((e) => e.group_hash);
      expect(groupHashes).not.to.contain(GROUP_4);
      expect(groupHashes.length).to.be(0);
    });

    it('should return recovering episodes unaffected by deactivation', async () => {
      const episodes = await fetchEpisodesWithFilter({ status: 'recovering' });

      const groupHashes = episodes.map((e) => e.group_hash);
      expect(groupHashes).to.contain(GROUP_5);
    });

    it('should combine status and rule filters with deactivation', async () => {
      const activeRuleA = await fetchEpisodesWithFilter({
        status: 'active',
        ruleId: RULE_A,
      });
      const activeRuleAHashes = activeRuleA.map((e) => e.group_hash);
      expect(activeRuleAHashes).to.contain(GROUP_2);
      expect(activeRuleAHashes).not.to.contain(GROUP_1);
      expect(activeRuleAHashes.length).to.be(1);

      const inactiveRuleB = await fetchEpisodesWithFilter({
        status: 'inactive',
        ruleId: RULE_B,
      });
      const inactiveRuleBHashes = inactiveRuleB.map((e) => e.group_hash);
      expect(inactiveRuleBHashes).to.contain(GROUP_3);
      expect(inactiveRuleBHashes).to.contain(GROUP_4);
      expect(inactiveRuleBHashes.length).to.be(2);
    });

    it('should return all episodes when no status filter is applied', async () => {
      const episodes = await fetchEpisodesWithFilter({});
      const groupHashes = episodes.map((e) => e.group_hash);

      expect(groupHashes).to.contain(GROUP_1);
      expect(groupHashes).to.contain(GROUP_2);
      expect(groupHashes).to.contain(GROUP_3);
      expect(groupHashes).to.contain(GROUP_4);
      expect(groupHashes).to.contain(GROUP_5);
    });
  });
}
