/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERTING_V2_ALERT_SUMMARY_API_PATH } from '@kbn/alerting-v2-constants';
import type { AlertSummaryRequest, AlertSummaryResponse } from '@kbn/alerting-v2-schemas';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials } from '../../services';
import { createAlertEvent, indexAlertEvents } from './fixtures';

const ALERTING_EVENTS_INDEX = '.rule-events';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');

  describe('Alerting V2 Alert Summary', function () {
    this.tags(['skipServerless']);
    let roleAuthc: RoleCredentials;

    // All test data is pinned to a single day so the 11 scenarios can share the
    // same seeded dataset and the resulting buckets are deterministic.
    const BASE_DAY = '2025-01-15';
    const GTE = `${BASE_DAY}T00:00:00.000Z`;
    const LTE = `${BASE_DAY}T23:59:59.999Z`;
    const OUT_OF_RANGE_BEFORE = '2025-01-14T23:59:00.000Z';
    const OUT_OF_RANGE_AFTER = '2025-01-16T00:01:00.000Z';

    const RULE_A = 'summary-test-rule-a';
    const RULE_B = 'summary-test-rule-b';
    const RULE_OTHER_SPACE = 'summary-test-rule-other-space';
    const RULE_SIGNAL = 'summary-test-rule-signal';
    const RULE_NO_DATA = 'summary-test-rule-no-data';
    const RULE_BUCKET_ALIGN = 'summary-test-rule-bucket-align';
    // 25 rule ids to exercise the multi-param array path in the ES|QL builder.
    const RULES_LARGE: string[] = Array.from(
      { length: 25 },
      (_, i) => `summary-test-rule-large-${i}`
    );

    async function postSummary(
      body: AlertSummaryRequest
    ): Promise<{ status: number; body: AlertSummaryResponse }> {
      const response = await supertestWithoutAuth
        .post(ALERTING_V2_ALERT_SUMMARY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(body);
      return { status: response.status, body: response.body as AlertSummaryResponse };
    }

    function eventAt(timestamp: string, overrides: Parameters<typeof createAlertEvent>[0] = {}) {
      return createAlertEvent({
        '@timestamp': timestamp,
        scheduled_timestamp: timestamp,
        ...overrides,
      });
    }

    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      // Ensure we start from a clean slate in case a previous suite left data behind.
      await esClient.deleteByQuery(
        {
          index: ALERTING_EVENTS_INDEX,
          query: { match_all: {} },
          refresh: true,
          wait_for_completion: true,
          conflicts: 'proceed',
        },
        { ignore: [404] }
      );

      const events = [
        // Rule A: 5 breached + 3 recovered within range
        eventAt(`${BASE_DAY}T01:00:00.000Z`, {
          rule: { id: RULE_A, version: 1 },
          status: 'breached',
        }),
        eventAt(`${BASE_DAY}T02:00:00.000Z`, {
          rule: { id: RULE_A, version: 1 },
          status: 'breached',
        }),
        eventAt(`${BASE_DAY}T03:00:00.000Z`, {
          rule: { id: RULE_A, version: 1 },
          status: 'breached',
        }),
        eventAt(`${BASE_DAY}T04:00:00.000Z`, {
          rule: { id: RULE_A, version: 1 },
          status: 'breached',
        }),
        eventAt(`${BASE_DAY}T05:00:00.000Z`, {
          rule: { id: RULE_A, version: 1 },
          status: 'breached',
        }),
        eventAt(`${BASE_DAY}T06:00:00.000Z`, {
          rule: { id: RULE_A, version: 1 },
          status: 'recovered',
        }),
        eventAt(`${BASE_DAY}T07:00:00.000Z`, {
          rule: { id: RULE_A, version: 1 },
          status: 'recovered',
        }),
        eventAt(`${BASE_DAY}T08:00:00.000Z`, {
          rule: { id: RULE_A, version: 1 },
          status: 'recovered',
        }),

        // Rule B: 4 breached + 2 recovered
        eventAt(`${BASE_DAY}T10:00:00.000Z`, {
          rule: { id: RULE_B, version: 1 },
          status: 'breached',
        }),
        eventAt(`${BASE_DAY}T11:00:00.000Z`, {
          rule: { id: RULE_B, version: 1 },
          status: 'breached',
        }),
        eventAt(`${BASE_DAY}T12:00:00.000Z`, {
          rule: { id: RULE_B, version: 1 },
          status: 'breached',
        }),
        eventAt(`${BASE_DAY}T13:00:00.000Z`, {
          rule: { id: RULE_B, version: 1 },
          status: 'breached',
        }),
        eventAt(`${BASE_DAY}T14:00:00.000Z`, {
          rule: { id: RULE_B, version: 1 },
          status: 'recovered',
        }),
        eventAt(`${BASE_DAY}T15:00:00.000Z`, {
          rule: { id: RULE_B, version: 1 },
          status: 'recovered',
        }),

        // Out-of-range events for Rule A (should be excluded by time range)
        eventAt(OUT_OF_RANGE_BEFORE, {
          rule: { id: RULE_A, version: 1 },
          status: 'breached',
        }),
        eventAt(OUT_OF_RANGE_AFTER, {
          rule: { id: RULE_A, version: 1 },
          status: 'recovered',
        }),

        // Other-space event for Rule A: must be invisible to the default-space caller
        eventAt(`${BASE_DAY}T01:00:00.000Z`, {
          rule: { id: RULE_OTHER_SPACE, version: 1 },
          status: 'breached',
          space_id: 'other-space',
        }),

        // Wrong-type event (type: signal) for a dedicated rule -- must be excluded
        eventAt(`${BASE_DAY}T01:00:00.000Z`, {
          rule: { id: RULE_SIGNAL, version: 1 },
          status: 'breached',
          type: 'signal',
        }),

        // no_data status event -- must be excluded from both counts
        eventAt(`${BASE_DAY}T01:00:00.000Z`, {
          rule: { id: RULE_NO_DATA, version: 1 },
          status: 'no_data',
        }),

        // Bucket-alignment events: place two breached in the same 1-hour bucket
        // at 04:00, and one recovered at 05:00. The gap at 06:00 must appear in
        // both series with zero doc_count via the 4-arg BUCKET() call.
        eventAt(`${BASE_DAY}T04:05:00.000Z`, {
          rule: { id: RULE_BUCKET_ALIGN, version: 1 },
          status: 'breached',
        }),
        eventAt(`${BASE_DAY}T04:45:00.000Z`, {
          rule: { id: RULE_BUCKET_ALIGN, version: 1 },
          status: 'breached',
        }),
        eventAt(`${BASE_DAY}T05:20:00.000Z`, {
          rule: { id: RULE_BUCKET_ALIGN, version: 1 },
          status: 'recovered',
        }),

        // Large ruleIds path: 1 breached + 1 recovered per rule, 25 rules total.
        ...RULES_LARGE.flatMap((id) => [
          eventAt(`${BASE_DAY}T09:00:00.000Z`, {
            rule: { id, version: 1 },
            status: 'breached',
          }),
          eventAt(`${BASE_DAY}T09:30:00.000Z`, {
            rule: { id, version: 1 },
            status: 'recovered',
          }),
        ]),
      ];

      await indexAlertEvents(esClient, events);
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      await esClient.deleteByQuery(
        {
          index: ALERTING_EVENTS_INDEX,
          query: { match_all: {} },
          refresh: true,
          wait_for_completion: true,
          conflicts: 'proceed',
        },
        { ignore: [404] }
      );
    });

    it('returns counts for a single rule', async () => {
      const { status, body } = await postSummary({
        gte: GTE,
        lte: LTE,
        fixed_interval: '1 hour',
        ruleIds: [RULE_A],
      });

      expect(status).to.be(200);
      expect(body.activeEventCount).to.be(5);
      expect(body.recoveredEventCount).to.be(3);
      const activeSum = body.activeSeries.reduce((acc, b) => acc + b.doc_count, 0);
      const recoveredSum = body.recoveredSeries.reduce((acc, b) => acc + b.doc_count, 0);
      expect(activeSum).to.be(5);
      expect(recoveredSum).to.be(3);
    });

    it('aggregates across multiple rules', async () => {
      const bothRes = await postSummary({
        gte: GTE,
        lte: LTE,
        fixed_interval: '1 hour',
        ruleIds: [RULE_A, RULE_B],
      });
      expect(bothRes.status).to.be(200);
      expect(bothRes.body.activeEventCount).to.be(5 + 4);
      expect(bothRes.body.recoveredEventCount).to.be(3 + 2);

      const onlyA = await postSummary({
        gte: GTE,
        lte: LTE,
        fixed_interval: '1 hour',
        ruleIds: [RULE_A],
      });
      expect(onlyA.body.activeEventCount).to.be(5);
      expect(onlyA.body.recoveredEventCount).to.be(3);

      const onlyB = await postSummary({
        gte: GTE,
        lte: LTE,
        fixed_interval: '1 hour',
        ruleIds: [RULE_B],
      });
      expect(onlyB.body.activeEventCount).to.be(4);
      expect(onlyB.body.recoveredEventCount).to.be(2);
    });

    it('excludes events outside the requested time range', async () => {
      // Explicitly scope to Rule A, for which we seeded two out-of-range events.
      const { body } = await postSummary({
        gte: GTE,
        lte: LTE,
        fixed_interval: '1 hour',
        ruleIds: [RULE_A],
      });

      // The out-of-range breached + recovered events must not appear in counts.
      expect(body.activeEventCount).to.be(5);
      expect(body.recoveredEventCount).to.be(3);
      const earliest = body.activeSeries[0]?.key;
      if (earliest !== undefined) {
        expect(earliest).to.be.greaterThan(Date.parse(OUT_OF_RANGE_BEFORE));
      }
      const latest = body.recoveredSeries[body.recoveredSeries.length - 1]?.key;
      if (latest !== undefined) {
        expect(latest).to.be.lessThan(Date.parse(OUT_OF_RANGE_AFTER));
      }
    });

    it('aligns buckets to the fixed_interval and preserves zero-count buckets in parallel series', async () => {
      const { body } = await postSummary({
        gte: GTE,
        lte: LTE,
        fixed_interval: '1 hour',
        ruleIds: [RULE_BUCKET_ALIGN],
      });

      // The two series must be parallel with identical bucket keys, so the
      // client can render two lines without running any gap-fill logic.
      expect(body.activeSeries.length).to.be(body.recoveredSeries.length);
      for (let i = 0; i < body.activeSeries.length; i++) {
        expect(body.activeSeries[i].key).to.be(body.recoveredSeries[i].key);
        expect(body.activeSeries[i].key_as_string).to.be(body.recoveredSeries[i].key_as_string);
      }

      // Active series: bucket containing 04:05 and 04:45 has doc_count 2; no
      // other bucket has a positive active count.
      const bucket04 = body.activeSeries.find((b) => b.key_as_string.startsWith(`${BASE_DAY}T04:`));
      expect(bucket04).to.be.ok();
      expect(bucket04!.doc_count).to.be(2);
      const positiveActive = body.activeSeries.filter((b) => b.doc_count > 0);
      expect(positiveActive).to.have.length(1);

      // Recovered series: bucket containing 05:20 has doc_count 1, the rest 0.
      const bucket05 = body.recoveredSeries.find((b) =>
        b.key_as_string.startsWith(`${BASE_DAY}T05:`)
      );
      expect(bucket05).to.be.ok();
      expect(bucket05!.doc_count).to.be(1);
      const positiveRecovered = body.recoveredSeries.filter((b) => b.doc_count > 0);
      expect(positiveRecovered).to.have.length(1);
    });

    it('scopes results to the current space', async () => {
      // The caller is in the default space. Events seeded with space_id: 'other-space'
      // must not contribute, even when the caller asks for their rule id.
      const { body } = await postSummary({
        gte: GTE,
        lte: LTE,
        fixed_interval: '1 hour',
        ruleIds: [RULE_OTHER_SPACE],
      });
      expect(body.activeEventCount).to.be(0);
      expect(body.recoveredEventCount).to.be(0);
    });

    it('excludes events whose type is not "alert"', async () => {
      const { body } = await postSummary({
        gte: GTE,
        lte: LTE,
        fixed_interval: '1 hour',
        ruleIds: [RULE_SIGNAL],
      });
      expect(body.activeEventCount).to.be(0);
      expect(body.recoveredEventCount).to.be(0);
    });

    it('ignores statuses other than "breached" and "recovered"', async () => {
      const { body } = await postSummary({
        gte: GTE,
        lte: LTE,
        fixed_interval: '1 hour',
        ruleIds: [RULE_NO_DATA],
      });
      expect(body.activeEventCount).to.be(0);
      expect(body.recoveredEventCount).to.be(0);
    });

    it('short-circuits to a zeroed response when ruleIds is empty', async () => {
      const { status, body } = await postSummary({
        gte: GTE,
        lte: LTE,
        fixed_interval: '1 hour',
        ruleIds: [],
      });
      expect(status).to.be(200);
      expect(body).to.eql({
        activeEventCount: 0,
        recoveredEventCount: 0,
        activeSeries: [],
        recoveredSeries: [],
      });
    });

    it('aggregates across a large list of rule ids', async () => {
      const { status, body } = await postSummary({
        gte: GTE,
        lte: LTE,
        fixed_interval: '1 hour',
        ruleIds: RULES_LARGE,
      });
      expect(status).to.be(200);
      expect(body.activeEventCount).to.be(RULES_LARGE.length);
      expect(body.recoveredEventCount).to.be(RULES_LARGE.length);
    });

    it('rejects invalid fixed_interval values', async () => {
      const response = await supertestWithoutAuth
        .post(ALERTING_V2_ALERT_SUMMARY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          gte: GTE,
          lte: LTE,
          fixed_interval: '1h', // short form is rejected by the schema
          ruleIds: [RULE_A],
        });
      expect(response.status).to.be(400);
    });
  });
}
