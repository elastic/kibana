/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_FLAPPING,
  ALERT_INSTANCE_ID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_DELAYED,
  ALERT_UUID,
  EVENT_ACTION,
  EVENT_KIND,
} from '@kbn/rule-data-utils';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { Spaces } from '../../../../scenarios';
import {
  getEventLog,
  getTestRuleData,
  getUrlPrefix,
  ObjectRemover,
} from '../../../../../common/lib';

// Regression test for https://github.com/elastic/kibana/issues/259886.
//
// When a delayed alert is reactivated by flap-hold (its predecessor was a
// delayed AAD doc, not an active one) and the executor does not report it on
// the run that triggers graduation, the active doc must still carry the rule
// type fields the executor reported during the delayed runs. Pre-fix the
// builder dispatched to `buildNewAlert` with an empty payload and produced an
// active doc with blank rule type fields. Post-fix `buildDelayedAlert` keeps
// the full payload on the delayed doc and `buildGraduatedAlert` merges that
// payload back in on graduation.
export default function alertsAsDataAlertDelayGraduationTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertestWithoutAuth);

  type PatternFiringAlert = Alert & { patternIndex: number; instancePattern: boolean[] };

  const alertsAsDataIndex = '.alerts-test.patternfiring.alerts-default';

  describe('alerts as data alert delay graduation (flap-hold reactivation)', function () {
    this.tags('skipFIPS');

    afterEach(async () => {
      await objectRemover.removeAll();
      await es.deleteByQuery({
        index: alertsAsDataIndex,
        query: { match_all: {} },
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    it('preserves rule type payload when a delayed alert graduates via flap-hold reactivation', async () => {
      const pattern = {
        instance: [true, true, false, false, true, false],
      };

      // statusChangeThreshold=2 + lookBackWindow default (20) + alertDelay=2 is
      // the smallest config that exercises the bug path: the alert spends a
      // run as delayed (run 5) and is then reactivated via flap-hold without
      // the executor reporting on the run that flips it to active (run 6).
      // Per-rule flapping overrides the space defaults, so we don't need to
      // touch the global rules settings (and wait out their cache).
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiringAad',
            // Long interval so we drive every run via _run_soon and the test
            // is not racing against the scheduler.
            schedule: { interval: '1d' },
            throttle: null,
            notify_when: null,
            // `setRecoveryPayload: false` keeps `cleanedPayload` empty on the
            // run that recovers the alert. Otherwise the rule type's default
            // recovery hook would write `{ patternIndex: -1 }` into
            // `reportedAlerts['instance']`, which would then win the deep
            // merge over the trackedDelayed predecessor and mask the
            // assertion that proves the predecessor's payload survives the
            // graduation.
            params: { pattern, setRecoveryPayload: false },
            alert_delay: { active: 2 },
            flapping: {
              look_back_window: 20,
              status_change_threshold: 2,
            },
          })
        );
      expect(response.status).to.eql(200);
      const ruleId = response.body.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      // Drive runs 1..6.
      await waitForExecutionCount(ruleId, 1);
      for (let runCount = 2; runCount <= 6; runCount++) {
        await runRuleSoon(ruleId);
        await waitForExecutionCount(ruleId, runCount);
      }

      // After 6 runs the AAD index should hold:
      // - the recovered doc that was created during the run-3 recovery (UUID #1)
      // - the graduated active doc produced in run 6 (UUID #2)
      const docs = await queryAlertDocs(ruleId);
      const activeDocs = docs.filter((hit) => hit._source?.[ALERT_STATUS] === ALERT_STATUS_ACTIVE);
      expect(activeDocs.length).to.equal(1);

      const graduatedDoc = activeDocs[0]._source!;

      // `buildGraduatedAlert` is the only path that sets EVENT_ACTION='open'
      // for an alert whose predecessor was a delayed doc. Asserting on it
      // pins down which builder ran.
      expect(graduatedDoc[EVENT_ACTION]).to.eql('open');
      expect(graduatedDoc[EVENT_KIND]).to.eql('signal');
      expect(graduatedDoc[ALERT_STATUS]).to.eql(ALERT_STATUS_ACTIVE);
      expect(graduatedDoc[ALERT_INSTANCE_ID]).to.eql('instance');
      // Flapping was triggered by the recovery in run 6 and is what reactivated
      // the alert. If this is false the test stopped exercising the flap-hold
      // path before the fix and the assertions below would not catch the bug.
      expect(graduatedDoc[ALERT_FLAPPING]).to.eql(true);

      // The actual regression: the rule type payload reported during the
      // delayed run (run 5) must survive the graduation in run 6. Pre-fix
      // these fields were absent because `buildNewAlert` ran with an empty
      // payload.
      expect(graduatedDoc.patternIndex).to.eql(4);
      expect(graduatedDoc.instancePattern).to.eql([true, true, false, false, true, false]);

      // Sanity check that no stale delayed doc was left behind under the
      // graduated alert's UUID.
      const graduatedUuid = graduatedDoc[ALERT_UUID];
      const danglingDelayed = docs.find(
        (hit) =>
          hit._source?.[ALERT_UUID] === graduatedUuid &&
          hit._source?.[ALERT_STATUS] === ALERT_STATUS_DELAYED
      );
      expect(danglingDelayed).to.be(undefined);
    });
  });

  async function queryAlertDocs(ruleId: string) {
    const result = await es.search<PatternFiringAlert>({
      index: alertsAsDataIndex,
      query: {
        bool: {
          must: [{ term: { 'kibana.alert.rule.uuid': ruleId } }],
        },
      },
    });
    return result.hits.hits as Array<SearchHit<PatternFiringAlert>>;
  }

  async function runRuleSoon(ruleId: string) {
    const runSoon = await supertestWithoutAuth
      .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
      .set('kbn-xsrf', 'foo');
    expect(runSoon.status).to.eql(204);
  }

  async function waitForExecutionCount(ruleId: string, count: number): Promise<IValidatedEvent[]> {
    return await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: ruleId,
        provider: 'alerting',
        actions: new Map([['execute', { equal: count }]]),
      });
    });
  }
}
