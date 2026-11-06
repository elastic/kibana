/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Regression test for space isolation in bulk untrack.
 *
 * Scenario: a user with `stackAlerts: ['all']` only in space1 calls
 * `POST /s/space1/internal/alerting/alerts/_bulk_untrack` supplying a
 * client-side index and alert UUID that belong to space2. The foreign alert
 * must remain active regardless of what the override-path call returns.
 *
 * The hard assertion is the alert-document state, not the override-path
 * status code, so the test decouples from the fix shape.
 */

import expect from '@kbn/expect';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { ALERT_STATUS, ALERT_UUID, SPACE_IDS } from '@kbn/rule-data-utils';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover, getEventLog } from '../../../../common/lib';

const STACK_ALERTS_INDEX = '.alerts-stack.alerts-default';

// Low-privilege user: stackAlerts:['all'] in space1 only, no privileges in space2.
const SPACE1_ONLY_USER = 'stack_alerts_only';
const SPACE1_ONLY_PASS = 'stack_alerts_only-password';

export default function bulkUntrackSpaceIsolationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('bulk untrack space isolation', () => {
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    afterEach(async () => {
      await objectRemover.removeAll();
      await es.deleteByQuery({
        index: STACK_ALERTS_INDEX,
        query: { match_all: {} },
        conflicts: 'proceed',
        ignore_unavailable: true,
        refresh: true,
      });
    });

    after(async () => {
      await esTestIndexTool.destroy();
    });

    it('alert in another space must remain active when untrack is called from own space', async () => {
      // Index a document with a current timestamp so the rule fires on its
      // first execution.
      await es.index({
        index: ES_TEST_INDEX_NAME,
        document: { date: new Date().toISOString() },
        refresh: true,
      });

      // Create the rule in space2 as admin.
      const { body: space2Rule } = await supertest
        .post(`${getUrlPrefix('space2')}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'bulk-untrack-space-isolation',
          consumer: 'stackAlerts',
          enabled: true,
          rule_type_id: '.es-query',
          schedule: { interval: '1d' },
          actions: [],
          notify_when: 'onActiveAlert',
          params: {
            size: 100,
            timeWindowSize: 60,
            timeWindowUnit: 'm',
            thresholdComparator: '>',
            threshold: [0],
            searchType: 'esQuery',
            timeField: 'date',
            esQuery: '{"query":{"match_all":{}}}',
            index: [ES_TEST_INDEX_NAME],
            excludeHitsFromPreviousRun: false,
          },
        })
        .expect(200);

      objectRemover.add('space2', space2Rule.id, 'rule', 'alerting');

      // Wait for the rule to execute and produce an active alert.
      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'space2',
          type: 'alert',
          id: space2Rule.id,
          provider: 'alerting',
          actions: new Map([['active-instance', { gte: 1 }]]),
        });
      });

      // Capture the alert UUID. By the time the event log confirms execution the
      // document is already written, so this should resolve immediately.
      let space2AlertUuid!: string;
      await retry.try(async () => {
        const result = await es.search({
          index: STACK_ALERTS_INDEX,
          query: { term: { 'kibana.alert.rule.uuid': space2Rule.id } },
          ignore_unavailable: true,
        });
        const hits = result.hits.hits;
        if (hits.length === 0) {
          throw new Error('Alert doc not yet visible in stack alerts index');
        }
        const source = hits[0]._source as Record<string, unknown>;
        if (source[ALERT_STATUS] !== 'active') {
          throw new Error(`Expected active alert, got status: ${source[ALERT_STATUS]}`);
        }
        space2AlertUuid = source[ALERT_UUID] as string;
      });

      // Step 1 - direct call: user without space2 access calls the space2 route.
      // Must return 403. This also validates the test setup: if the role were
      // misconfigured with space2 access, this would fail and tell us the
      // premises of the test are wrong.
      const directResponse = await supertestWithoutAuth
        .post(`${getUrlPrefix('space2')}/internal/alerting/alerts/_bulk_untrack`)
        .set('kbn-xsrf', 'foo')
        .auth(SPACE1_ONLY_USER, SPACE1_ONLY_PASS)
        .send({
          indices: [STACK_ALERTS_INDEX],
          alert_uuids: [space2AlertUuid],
        });

      expect(directResponse.statusCode).to.eql(403);

      // Step 2 - own-space call with foreign alert UUID: user calls the space1
      // route supplying a client-side index and the space2 alert UUID. We do not
      // assert the status code here because the fix shape is not yet determined
      // (may be 204 no-op, 403, or 400).
      await supertestWithoutAuth
        .post(`${getUrlPrefix('space1')}/internal/alerting/alerts/_bulk_untrack`)
        .set('kbn-xsrf', 'foo')
        .auth(SPACE1_ONLY_USER, SPACE1_ONLY_PASS)
        .send({
          indices: [STACK_ALERTS_INDEX],
          alert_uuids: [space2AlertUuid],
        });

      // Step 3 - space isolation invariant: the space2 alert must still be
      // active and still belong to space2 regardless of what step 2 returned.
      // This assertion FAILS on vulnerable code (alert becomes untracked) and
      // PASSES once the fix lands.
      const { hits } = (
        await es.search({
          index: STACK_ALERTS_INDEX,
          query: { term: { 'kibana.alert.rule.uuid': space2Rule.id } },
          ignore_unavailable: true,
        })
      ).hits;

      expect(hits.length).to.be.greaterThan(0);

      const space2AlertDoc = hits.find(
        (h) => (h._source as Record<string, unknown>)[ALERT_UUID] === space2AlertUuid
      );
      expect(space2AlertDoc).not.to.be(undefined);

      const source = space2AlertDoc!._source as Record<string, unknown>;

      expect(source[SPACE_IDS]).to.eql(['space2']);
      expect(source[ALERT_STATUS]).to.eql('active');
    });
  });
}
