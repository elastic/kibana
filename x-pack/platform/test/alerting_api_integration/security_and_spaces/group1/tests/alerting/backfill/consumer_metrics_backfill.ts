/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import { waitForEventLogDocs } from './test_utils';
import { SuperuserAtSpace1 } from '../../../../scenarios';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';

const EXPECTED_CONSUMER_METRICS = {
  alerts_candidate_count: 90357,
  alerts_suppressed_count: 42,
  total_indexing_duration_ms: 987,
  total_enrichment_duration_ms: 654,
  frozen_indices_queried_count: 3,
} as const;

export default function consumerMetricsBackfillTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('consumer metrics on execute-backfill events', () => {
    let backfillId: string | undefined;

    beforeEach(async () => {
      backfillId = undefined;
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    afterEach(async () => {
      if (backfillId) {
        await supertest
          .delete(
            `${getUrlPrefix(
              SuperuserAtSpace1.space.id
            )}/internal/alerting/rules/backfill/${backfillId}`
          )
          .set('kbn-xsrf', 'foo');
      }
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
    });

    it('writes consumer metrics from the rule executor to execute-backfill events', async () => {
      const spaceId = SuperuserAtSpace1.space.id;

      const response1 = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send({
          enabled: true,
          name: 'consumer metrics backfill rule',
          tags: [],
          rule_type_id: 'test.consumer-metrics',
          consumer: 'alertsFixture',
          schedule: { interval: '24h' },
          actions: [],
          params: {
            index: ES_TEST_INDEX_NAME,
            reference: 'backfill-ref',
          },
        })
        .expect(200);

      const ruleId = response1.body.id;
      objectRemover.add(spaceId, ruleId, 'rule', 'alerting');

      const start = moment().utc().startOf('day').subtract(7, 'days').toISOString();
      const end = moment().utc().startOf('day').subtract(1, 'day').toISOString();

      const response2 = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send([{ rule_id: ruleId, ranges: [{ start, end }] }])
        .expect(200);

      backfillId = response2.body[0].id;

      const events: IValidatedEvent[] = await waitForEventLogDocs(
        retry,
        getService,
        backfillId as string,
        spaceId,
        new Map([['execute-backfill', { gte: 1 }]])
      );

      const backfillEvents = events.filter((e) => e?.event?.action === 'execute-backfill');
      expect(backfillEvents.length > 0).to.be(true);

      for (const e of backfillEvents) {
        const metrics = e?.kibana?.alert?.rule?.execution?.metrics;
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
      }
    });
  });
}
