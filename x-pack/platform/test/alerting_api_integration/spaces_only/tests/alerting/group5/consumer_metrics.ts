/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { Spaces } from '../../../scenarios';
import {
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getEventLog,
  resetRulesSettings,
} from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

const EXPECTED_CONSUMER_METRICS = {
  alerts_candidate_count: 90357,
  alerts_suppressed_count: 42,
  total_indexing_duration_ms: 987,
  total_enrichment_duration_ms: 654,
  frozen_indices_queried_count: 3,
} as const;

export default function consumerMetricsEventLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const objectRemover = new ObjectRemover(supertest);

  describe('consumer metrics on rule execute event', () => {
    beforeEach(async () => {
      await resetRulesSettings(supertest, Spaces.default.id);
      await resetRulesSettings(supertest, Spaces.space1.id);
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('writes consumer metrics from the rule executor to the execute event', async () => {
      const spaceId = Spaces.default.id;
      const response = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.consumer-metrics',
            schedule: { interval: '24h' },
            throttle: null,
            notify_when: undefined,
            params: {
              index: ES_TEST_INDEX_NAME,
              reference: 'consumer-metrics-ref',
            },
            actions: [],
          })
        )
        .expect(200);

      const ruleId = response.body.id;
      objectRemover.add(spaceId, ruleId, 'rule', 'alerting');

      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([
            ['execute-start', { equal: 1 }],
            ['execute', { equal: 1 }],
          ]),
        });
      });

      const executeEvent = events.find((e) => e?.event?.action === 'execute');
      expect(executeEvent).to.be.ok();
      const metrics = executeEvent?.kibana?.alert?.rule?.execution?.metrics;
      expect(metrics?.alerts_candidate_count).to.eql(
        EXPECTED_CONSUMER_METRICS.alerts_candidate_count
      );
      expect(metrics?.alerts_suppressed_count).to.eql(
        EXPECTED_CONSUMER_METRICS.alerts_suppressed_count
      );
      expect(metrics?.total_indexing_duration_ms).to.eql(
        EXPECTED_CONSUMER_METRICS.total_indexing_duration_ms
      );
      expect(metrics?.total_enrichment_duration_ms).to.eql(
        EXPECTED_CONSUMER_METRICS.total_enrichment_duration_ms
      );
      expect(metrics?.frozen_indices_queried_count).to.eql(
        EXPECTED_CONSUMER_METRICS.frozen_indices_queried_count
      );
    });
  });
}
