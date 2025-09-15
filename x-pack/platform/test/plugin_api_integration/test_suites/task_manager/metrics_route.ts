/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import url from 'url';
import supertest from 'supertest';
import { NodeMetrics } from '@kbn/task-manager-plugin/server/routes/metrics';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const config = getService('config');
  const retry = getService('retry');
  const request = supertest(url.format(config.get('servers.kibana')));
  const es = getService('es');

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  function getMetricsRequest(reset: boolean = false) {
    return request
      .get(`/api/task_manager/metrics${reset ? '' : '?reset=false'}`)
      .set('kbn-xsrf', 'foo')
      .expect(200)
      .then((response) => response.body);
  }

  function getMetrics(
    reset: boolean = false,
    callback?: (metrics: NodeMetrics) => boolean
  ): Promise<NodeMetrics> {
    return retry.try(async () => {
      const metrics = await getMetricsRequest(reset);

      if (metrics.metrics) {
        if ((callback && callback(metrics)) || !callback) {
          return metrics;
        }
      }

      await delay(500);
      throw new Error('Expected metrics not received');
    });
  }

  describe('task manager metrics', () => {
    describe('task claim', () => {
      it('should increment task claim success/total counters', async () => {
        // reset metrics counter
        await getMetrics(true);
        const metricsResetTime = Date.now();
        // we've resetted the metrics and have 30 seconds before they reset again
        // wait for the first set of metrics to be returned after the reset
        const initialMetrics = (
          await getMetrics(
            false,
            (metrics) =>
              !!metrics?.metrics?.task_claim?.timestamp &&
              new Date(metrics?.metrics?.task_claim?.timestamp).getTime() > metricsResetTime
          )
        ).metrics;
        expect(initialMetrics).not.to.be(null);
        expect(initialMetrics?.task_claim).not.to.be(null);
        expect(initialMetrics?.task_claim?.value).not.to.be(null);

        let previousTaskClaimSuccess = initialMetrics?.task_claim?.value.total!;
        let previousTaskClaimTotal = initialMetrics?.task_claim?.value.success!;
        let previousTaskClaimTimestamp: string = initialMetrics?.task_claim?.timestamp!;

        for (let i = 0; i < 5; ++i) {
          const metrics = (
            await getMetrics(
              false,
              (m: NodeMetrics) => m.metrics?.task_claim?.timestamp !== previousTaskClaimTimestamp
            )
          ).metrics;
          expect(metrics).not.to.be(null);
          expect(metrics?.task_claim).not.to.be(null);
          expect(metrics?.task_claim?.value).not.to.be(null);

          expect(metrics?.task_claim?.value.success).to.be.greaterThan(previousTaskClaimSuccess);
          expect(metrics?.task_claim?.value.total).to.be.greaterThan(previousTaskClaimTotal);

          previousTaskClaimTimestamp = metrics?.task_claim?.timestamp!;
          previousTaskClaimSuccess = metrics?.task_claim?.value.success!;
          previousTaskClaimTotal = metrics?.task_claim?.value.total!;

          // check that duration histogram exists
          expect(metrics?.task_claim?.value.duration).not.to.be(null);
          expect(Array.isArray(metrics?.task_claim?.value.duration.counts)).to.be(true);
          expect(Array.isArray(metrics?.task_claim?.value.duration.values)).to.be(true);
        }
      });

      it('should reset task claim success/total counters at an interval', async () => {
        const initialCounterValue = 7;
        const initialMetrics = (
          await getMetrics(
            false,
            (metrics) => (metrics?.metrics?.task_claim?.value.total || 0) >= initialCounterValue
          )
        ).metrics;
        expect(initialMetrics).not.to.be(null);
        expect(initialMetrics?.task_claim).not.to.be(null);
        expect(initialMetrics?.task_claim?.value).not.to.be(null);

        // retry until counter value resets
        const resetMetrics = (
          await getMetrics(
            false,
            (m: NodeMetrics) => (m?.metrics?.task_claim?.value.total || 0) >= 1
          )
        ).metrics;
        expect(resetMetrics).not.to.be(null);
        expect(resetMetrics?.task_claim).not.to.be(null);
        expect(resetMetrics?.task_claim?.value).not.to.be(null);
      });

      it('should reset task claim success/total counters on request', async () => {
        const initialCounterValue = 1;
        const initialMetrics = (
          await getMetrics(
            false,
            (metrics) => (metrics?.metrics?.task_claim?.value.total || 0) >= initialCounterValue
          )
        ).metrics;
        expect(initialMetrics).not.to.be(null);
        expect(initialMetrics?.task_claim).not.to.be(null);
        expect(initialMetrics?.task_claim?.value).not.to.be(null);

        let previousTaskClaimTimestamp: string = initialMetrics?.task_claim?.timestamp!;

        for (let i = 0; i < 5; ++i) {
          const metrics = (
            await getMetrics(
              true,
              (m: NodeMetrics) => m.metrics?.task_claim?.timestamp !== previousTaskClaimTimestamp
            )
          ).metrics;
          expect(metrics).not.to.be(null);
          expect(metrics?.task_claim).not.to.be(null);
          expect(metrics?.task_claim?.value).not.to.be(null);

          expect(metrics?.task_claim?.value.success).to.be.greaterThan(0);
          expect(metrics?.task_claim?.value.total).to.be.greaterThan(0);

          previousTaskClaimTimestamp = metrics?.task_claim?.timestamp!;

          // check that duration histogram exists
          expect(metrics?.task_claim?.value.duration).not.to.be(null);
          expect(Array.isArray(metrics?.task_claim?.value.duration.counts)).to.be(true);
          expect(Array.isArray(metrics?.task_claim?.value.duration.values)).to.be(true);
        }
      });
    });

    describe('task run', () => {
      let ruleId: string | null = null;
      before(async () => {
        // create a rule that fires actions
        const rule = await request
          .post(`/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send({
            enabled: true,
            name: 'test rule',
            tags: [],
            rule_type_id: '.es-query',
            consumer: 'alerts',
            // set schedule long so we can control when it runs
            schedule: { interval: '1d' },
            actions: [],
            params: {
              aggType: 'count',
              esQuery: '{\n  "query":{\n    "match_all" : {}\n  }\n}',
              excludeHitsFromPreviousRun: false,
              groupBy: 'all',
              index: ['.kibana-event-log*'],
              searchType: 'esQuery',
              size: 100,
              termSize: 5,
              threshold: [0],
              thresholdComparator: '>',
              timeField: '@timestamp',
              timeWindowSize: 5,
              timeWindowUnit: 'm',
            },
          })
          .expect(200)
          .then((response) => response.body);

        ruleId = rule.id;
      });

      after(async () => {
        // delete rule
        await request.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo').expect(204);
      });

      it('should increment task run success/not_timed_out/total counters', async () => {
        const initialMetrics = (
          await getMetrics(
            false,
            (metrics) =>
              metrics?.metrics?.task_run?.value.by_type.alerting?.total === 1 &&
              metrics?.metrics?.task_run?.value.by_type.alerting?.not_timed_out === 1 &&
              metrics?.metrics?.task_run?.value.by_type.alerting?.success === 1 &&
              metrics?.metrics?.task_run?.value.by_type.alerting?.user_errors === 0 &&
              metrics?.metrics?.task_run?.value.by_type.alerting?.framework_errors === 0
          )
        ).metrics;
        expect(initialMetrics).not.to.be(null);
        expect(initialMetrics?.task_claim).not.to.be(null);
        expect(initialMetrics?.task_claim?.value).not.to.be(null);

        for (let i = 0; i < 1; ++i) {
          // run the rule and expect counters to increment
          await request
            .post('/api/sample_tasks/run_soon')
            .set('kbn-xsrf', 'xxx')
            .send({ task: { id: ruleId } })
            .expect(200);

          const metrics = (
            await getMetrics(
              false,
              (m) =>
                m?.metrics?.task_run?.value.by_type.alerting?.total === i + 2 &&
                m?.metrics?.task_run?.value.by_type.alerting?.not_timed_out === i + 2 &&
                m?.metrics?.task_run?.value.by_type.alerting?.success === i + 2 &&
                m?.metrics?.task_run?.value.by_type.alerting?.user_errors === 0 &&
                m?.metrics?.task_run?.value.by_type.alerting?.framework_errors === 0
            )
          ).metrics;

          // check that delay histogram exists
          expect(metrics?.task_run?.value?.overall?.delay).not.to.be(null);
          expect(Array.isArray(metrics?.task_run?.value?.overall?.delay.counts)).to.be(true);
          expect(Array.isArray(metrics?.task_run?.value?.overall?.delay.values)).to.be(true);
        }

        // counter should reset on its own
        await getMetrics(
          false,
          (metrics) =>
            metrics?.metrics?.task_run?.value.by_type.alerting?.total === 0 &&
            metrics?.metrics?.task_run?.value.by_type.alerting?.not_timed_out === 0 &&
            metrics?.metrics?.task_run?.value.by_type.alerting?.success === 0
        );
      });

      it('should increment task run framework_error counter', async () => {
        // modify the rule to get it fire a decryption error
        await es.updateByQuery({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          body: {
            script: {
              lang: 'painless',
              source: 'ctx._source.alert.params.foo = "bar"',
            },
            query: { ids: { values: [`alert:${ruleId}`] } },
          },
          refresh: true,
          conflicts: 'proceed',
        });

        // run the rule and expect counters to increment
        await request
          .post('/api/sample_tasks/run_soon')
          .set('kbn-xsrf', 'xxx')
          .send({ task: { id: ruleId } })
          .expect(200);

        const metrics = (
          await getMetrics(true, (m) => m?.metrics?.task_run?.value.overall.framework_errors! === 1)
        ).metrics;

        const total = metrics?.task_run?.value.overall.total || 0;
        const success = metrics?.task_run?.value.overall.success || 0;

        expect(total - success).to.be(1);
      });

      it('should increment task run user_errors counter', async () => {
        // modify the rule to get it fire a validation error
        await es.updateByQuery({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          body: {
            script: {
              lang: 'painless',
              source: 'ctx._source.alert.params.foo = "bar"',
            },
            query: { ids: { values: [`alert:${ruleId}`] } },
          },
          refresh: true,
          conflicts: 'proceed',
        });

        // update apiKey to fix decryption error
        await request
          .post(`/api/alerts/alert/${ruleId}/_update_api_key`)
          .set('kbn-xsrf', 'xxx')
          .expect(204);

        // run the rule and expect counters to increment
        await request
          .post('/api/sample_tasks/run_soon')
          .set('kbn-xsrf', 'xxx')
          .send({ task: { id: ruleId } })
          .expect(200);

        const metrics = (
          await getMetrics(true, (m) => m?.metrics?.task_run?.value.overall.user_errors! === 1)
        ).metrics;

        const total = metrics?.task_run?.value.overall.total || 0;
        const success = metrics?.task_run?.value.overall.success || 0;

        expect(total - success).to.be(1);
      });
    });

    describe('task overdue', () => {
      it('histograms should exist', async () => {
        const metrics = (await getMetrics(false)).metrics;
        expect(metrics).not.to.be(null);
        expect(metrics?.task_overdue).not.to.be(null);
        expect(metrics?.task_overdue?.value).not.to.be(null);
        expect(metrics?.task_overdue?.value.overall).not.to.be(null);
        expect(metrics?.task_overdue?.value.overall.overdue_by).not.to.be(null);
        expect(Array.isArray(metrics?.task_overdue?.value.overall.overdue_by.counts)).to.be(true);
        expect(Array.isArray(metrics?.task_overdue?.value.overall.overdue_by.values)).to.be(true);
      });
    });
  });
}
