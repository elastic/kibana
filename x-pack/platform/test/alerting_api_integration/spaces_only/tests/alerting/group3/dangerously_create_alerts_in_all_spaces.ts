/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Alert } from '@kbn/alerts-as-data-utils';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { SPACE_IDS } from '@kbn/rule-data-utils';
import { getEventLog, ObjectRemover, getTestRuleData } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { Spaces } from '../../../scenarios';

// eslint-disable-next-line import/no-default-export
export default function dangerouslyCreateAlertsInAllSpacesTests({
  getService,
}: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');

  const alertsAsDataIndex = '.alerts-test.dangerouslycreatealertsinallspaces.alerts-default';

  describe('dangerouslyCreateAlertsInAllSpaces', () => {
    const objectRemover = new ObjectRemover(supertestWithoutAuth);

    afterEach(async () => {
      await objectRemover.removeAll();
      await es.deleteByQuery({
        index: alertsAsDataIndex,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    it('creates alerts with space_id "*" for persistence rule type with dangerouslyCreateAlertsInAllSpaces enabled', async () => {
      const createdRule = await supertestWithoutAuth
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.persistenceDangerouslyCreateAlertsInAllSpaces',
            schedule: { interval: '1d' },
            throttle: null,
            params: {},
            actions: [],
          })
        );

      expect(createdRule.status).to.eql(200);
      const ruleId = createdRule.body.id;
      objectRemover.add(Spaces.default.id, ruleId, 'rule', 'alerting');

      // Wait for the event log execute doc so we can get the execution UUID
      await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 1 }]]));

      // Query for alerts
      const alertDocs = await queryForAlertDocs<Alert>();

      for (let i = 0; i < alertDocs.length; ++i) {
        const source: Alert = alertDocs[i]._source!;
        expect(source[SPACE_IDS]).to.eql(['*']);
      }
    });

    it('creates alerts with space_id "*" for alerting framework rule type with dangerouslyCreateAlertsInAllSpaces enabled', async () => {
      const createdRule = await supertestWithoutAuth
        .post(`/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.dangerouslyCreateAlertsInAllSpaces',
            schedule: { interval: '1d' },
            throttle: null,
            params: {},
            actions: [],
          })
        );

      expect(createdRule.status).to.eql(200);
      const ruleId = createdRule.body.id;
      objectRemover.add(Spaces.default.id, ruleId, 'rule', 'alerting');

      // Wait for the event log execute doc so we can get the execution UUID
      await waitForEventLogDocs(ruleId, new Map([['execute', { equal: 1 }]]));

      // Query for alerts
      const alertDocs = await queryForAlertDocs<Alert>();

      for (let i = 0; i < alertDocs.length; ++i) {
        const source: Alert = alertDocs[i]._source!;
        expect(source[SPACE_IDS]).to.eql(['*']);
      }
    });
  });

  async function queryForAlertDocs<T>(): Promise<Array<SearchHit<T>>> {
    const searchResult = await es.search({
      index: alertsAsDataIndex,
      query: { match_all: {} },
    });
    return searchResult.hits.hits as Array<SearchHit<T>>;
  }

  async function waitForEventLogDocs(
    id: string,
    actions: Map<string, { gte: number } | { equal: number }>
  ) {
    return await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: Spaces.default.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions,
      });
    });
  }
}
