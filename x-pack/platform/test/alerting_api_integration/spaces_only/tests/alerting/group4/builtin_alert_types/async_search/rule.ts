/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import {
  ENHANCED_ES_SEARCH_STRATEGY,
  EQL_SEARCH_STRATEGY,
  ESQL_ASYNC_SEARCH_STRATEGY,
} from '@kbn/data-plugin/common';
import { Spaces } from '../../../../../scenarios';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover, getEventLog } from '../../../../../../common/lib';
import { createEsDocuments } from '../../../create_test_data';

interface AlertSource {
  [key: string]: unknown;
  [ALERT_RULE_NAME]: string;
}

interface CreateRuleParams {
  name: string;
  ruleTypeId: string;
  strategy: string;
}

const RULE_INTERVAL_SECONDS = 6;
const RULE_INTERVALS_TO_WRITE = 5;
const RULE_INTERVAL_MILLIS = RULE_INTERVAL_SECONDS * 1000;
const ES_GROUPS_TO_WRITE = 3;

export default function ruleTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  const alertsAsDataIndex = '.internal.alerts-test.async.search.alerts-*';

  describe('rule with async search', () => {
    let endDate: string;
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.setup();
    });

    beforeEach(async () => {
      // write documents in the future, figure out the end date
      const endDateMillis = Date.now() + (RULE_INTERVALS_TO_WRITE - 1) * RULE_INTERVAL_MILLIS;
      endDate = new Date(endDateMillis).toISOString();
    });

    afterEach(async () => {
      await objectRemover.removeAll();
      await es.deleteByQuery({
        index: alertsAsDataIndex,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    after(async () => {
      await esTestIndexTool.destroy();
    });

    [ESQL_ASYNC_SEARCH_STRATEGY, ENHANCED_ES_SEARCH_STRATEGY, EQL_SEARCH_STRATEGY].forEach(
      (strategy) =>
        it(`Generates alerts when there are docs for the search strategy: ${strategy}`, async () => {
          await createEsDocuments(
            es,
            esTestIndexTool,
            endDate,
            RULE_INTERVALS_TO_WRITE,
            RULE_INTERVAL_MILLIS,
            ES_GROUPS_TO_WRITE
          );

          const ruleId = await createRule({
            name: 'rule with async search',
            ruleTypeId: 'test.ruleWithAsyncSearch',
            strategy,
          });

          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: Spaces.space1.id,
              type: 'alert',
              id: ruleId,
              provider: 'alerting',
              actions: new Map([['execute', { gte: 1 }]]),
            });
          });

          const alerts = await queryForAlertDocs();

          expect(alerts.length).to.be.greaterThan(0);
          const source = alerts[0]._source as AlertSource;
          expect(source[ALERT_RULE_NAME]).to.eql('rule with async search');

          const event = events[0];
          expect(event?.rule?.name).to.eql('rule with async search');
          expect(event?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.new).to.eql(1);
          expect(event?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active).to.eql(1);
        })
    );

    async function createRule(params: CreateRuleParams): Promise<string> {
      const { status, body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: params.name,
          consumer: 'alerts',
          enabled: true,
          rule_type_id: params.ruleTypeId,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [],
          notify_when: 'onActiveAlert',
          params: { strategy: params.strategy },
        });

      expect(status).to.be(200);

      const ruleId = createdRule.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      return ruleId;
    }

    async function queryForAlertDocs<T>(): Promise<Array<SearchHit<T>>> {
      const searchResult = await es.search({
        index: alertsAsDataIndex,
        query: { match_all: {} },
      });
      return searchResult.hits.hits as Array<SearchHit<T>>;
    }
  });
}
