/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import {
  ALERT_INSTANCE_ID,
  ALERT_MUTED,
  ALERT_RULE_UUID,
  ALERT_STATUS,
} from '@kbn/rule-data-utils';
import { Spaces } from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { AlertUtils, getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';

const alertAsDataIndexPattern = '.internal.alerts-observability.test.alerts.alerts-default-*';

// The perf config (config_perf.ts) sets xpack.alerting.rules.run.alerts.max=800
// so the depth scenario can generate up to 200 real alerts per rule.

export default function snoozeUnsnoozePerf({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const log = getService('log');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  /**
   * Reusable harness that creates rules, generates alerts, then runs a timed
   * snooze -> verify -> unsnooze -> verify cycle and logs a summary.
   *
   * `alertsPerRule` controls how many alert instances the rule executor reports.
   * `snoozesPerRule` controls how many instance IDs we snooze on each rule via
   * the _mute API (using validate_alerts_existence=false). When snoozesPerRule >
   * alertsPerRule, the extra IDs still populate snoozedInstances on the rule SO,
   * which is exactly what stresses the nested mapping write amplification.
   */
  const runPerfScenario = ({
    scenarioName,
    ruleCount,
    alertsPerRule,
    snoozesPerRule,
  }: {
    scenarioName: string;
    ruleCount: number;
    alertsPerRule: number;
    snoozesPerRule?: number;
  }) => {
    const effectiveSnoozesPerRule = snoozesPerRule ?? alertsPerRule;

    describe(scenarioName, () => {
      const objectRemover = new ObjectRemover(supertest);
      const alertUtils = new AlertUtils({
        space: Spaces.space1,
        supertestWithoutAuth: supertest,
      });

      const ruleIds: string[] = [];
      const ruleRealAlerts: Map<string, string[]> = new Map();

      const createRule = async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              rule_type_id: 'test.multi-alert-as-data',
              schedule: { interval: '24h' },
              throttle: undefined,
              notify_when: undefined,
              actions: [],
              params: {
                index: ES_TEST_INDEX_NAME,
                reference: `perf-${scenarioName}`,
                alertCount: alertsPerRule,
              },
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');
        return createdRule.id;
      };

      const getAlertsByRuleId = async (ruleId: string): Promise<any[]> => {
        await es.indices.refresh({ index: alertAsDataIndexPattern, ignore_unavailable: true });
        const {
          hits: { hits: alerts },
        } = await es.search({
          index: alertAsDataIndexPattern,
          ignore_unavailable: true,
          size: alertsPerRule + 10,
          query: {
            bool: {
              must: [
                { term: { [ALERT_RULE_UUID]: ruleId } },
                { term: { [ALERT_STATUS]: 'active' } },
              ],
            },
          },
        });
        return alerts;
      };

      const snoozeInstanceIds = Array.from({ length: effectiveSnoozesPerRule }, (_, i) =>
        String(i)
      );

      before(async function () {
        this.timeout(600000);
        await esTestIndexTool.setup();

        log.info(
          `[${scenarioName}] Creating ${ruleCount} rules (${alertsPerRule} real alerts, ${effectiveSnoozesPerRule} snoozes each)...`
        );
        const createStart = Date.now();
        for (let i = 0; i < ruleCount; i++) {
          const ruleId = await createRule();
          ruleIds.push(ruleId);
        }
        log.info(`[${scenarioName}] Created ${ruleCount} rules in ${Date.now() - createStart}ms`);

        log.info(`[${scenarioName}] Running rules to generate alerts...`);
        const runStart = Date.now();
        for (const ruleId of ruleIds) {
          await alertUtils.runSoon(ruleId);
        }

        log.info(`[${scenarioName}] Waiting for all alerts to appear...`);
        for (const ruleId of ruleIds) {
          await retry.tryForTime(120000, async () => {
            const alerts = await getAlertsByRuleId(ruleId);
            if (alerts.length < alertsPerRule) {
              throw new Error(
                `Rule ${ruleId}: expected ${alertsPerRule} alerts, got ${alerts.length}`
              );
            }
            ruleRealAlerts.set(
              ruleId,
              alerts.map((a: any) => a._source[ALERT_INSTANCE_ID] as string)
            );
          });
        }
        log.info(
          `[${scenarioName}] All ${ruleCount * alertsPerRule} alerts generated in ${
            Date.now() - runStart
          }ms`
        );
      });

      after(async function () {
        this.timeout(120000);
        await es.deleteByQuery({
          index: alertAsDataIndexPattern,
          query: { match_all: {} },
          conflicts: 'proceed',
          ignore_unavailable: true,
        });
        await objectRemover.removeAll();
        await esTestIndexTool.destroy();
      });

      it(`should snooze and unsnooze ${
        ruleCount * effectiveSnoozesPerRule
      } instances and report timings`, async function () {
        this.timeout(600000);
        const totalInstances = ruleCount * effectiveSnoozesPerRule;
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        // --- Phase 1: Bulk conditional snooze ---
        // Each _mute call on a rule rewrites all existing nested snoozedInstances docs.
        // For the depth scenario the Nth call rewrites N nested docs — O(N^2) total writes.
        log.info(
          `[${scenarioName}] Phase 1: Snoozing ${totalInstances} instances across ${ruleCount} rules...`
        );
        const snoozeStart = Date.now();
        for (const ruleId of ruleIds) {
          for (const instanceId of snoozeInstanceIds) {
            await supertest
              .post(
                `${getUrlPrefix(
                  Spaces.space1.id
                )}/api/alerting/rule/${ruleId}/alert/${instanceId}/_mute?validate_alerts_existence=false`
              )
              .set('kbn-xsrf', 'foo')
              .send({ expires_at: expiresAt })
              .expect(204);
          }
        }
        const snoozeDuration = Date.now() - snoozeStart;
        log.info(
          `[${scenarioName}] Phase 1 complete: snooze took ${snoozeDuration}ms (${(
            snoozeDuration / totalInstances
          ).toFixed(1)}ms/instance)`
        );

        // --- Phase 2: Run rules to persist snoozedInstances via updateRuleSavedObjectPostRun ---
        log.info(
          `[${scenarioName}] Phase 2: Running all rules to persist snoozedInstances on the rule SO...`
        );
        const runStart = Date.now();
        for (const ruleId of ruleIds) {
          await alertUtils.runSoon(ruleId);
        }
        for (const ruleId of ruleIds) {
          await retry.tryForTime(60000, async () => {
            const { body: rule } = await supertest
              .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
              .expect(200);
            if (rule.execution_status.status === 'pending') {
              throw new Error(`Rule ${ruleId} still pending`);
            }
          });
        }
        const runDuration = Date.now() - runStart;
        log.info(`[${scenarioName}] Phase 2 complete: rule runs took ${runDuration}ms`);

        // --- Phase 3: Verify snoozedInstances on rule SOs ---
        log.info(`[${scenarioName}] Phase 3: Verifying snoozed_instances on each rule...`);
        for (const ruleId of ruleIds) {
          const { body: rule } = await supertest
            .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
            .expect(200);
          expect((rule.snoozed_instances ?? []).length).to.be(effectiveSnoozesPerRule);
        }
        log.info(`[${scenarioName}] Phase 3 complete: all rules have correct snoozed_instances`);

        // --- Phase 4: Verify ALERT_MUTED on real AAD docs ---
        log.info(`[${scenarioName}] Phase 4: Verifying ALERT_MUTED on AAD docs...`);
        for (const ruleId of ruleIds) {
          await retry.tryForTime(30000, async () => {
            const alerts = await getAlertsByRuleId(ruleId);
            for (const alert of alerts) {
              expect((alert as any)._source[ALERT_MUTED]).to.be(true);
            }
          });
        }
        log.info(`[${scenarioName}] Phase 4 complete: all real alerts show ALERT_MUTED=true`);

        // --- Phase 5: Bulk unsnooze (unmute) ---
        log.info(`[${scenarioName}] Phase 5: Unsnoozing ${totalInstances} instances...`);
        const unsnoozeStart = Date.now();
        for (const ruleId of ruleIds) {
          for (const instanceId of snoozeInstanceIds) {
            await supertest
              .post(
                `${getUrlPrefix(
                  Spaces.space1.id
                )}/api/alerting/rule/${ruleId}/alert/${instanceId}/_unmute`
              )
              .set('kbn-xsrf', 'foo')
              .expect(204);
          }
        }
        const unsnoozeDuration = Date.now() - unsnoozeStart;
        log.info(
          `[${scenarioName}] Phase 5 complete: unsnooze took ${unsnoozeDuration}ms (${(
            unsnoozeDuration / totalInstances
          ).toFixed(1)}ms/instance)`
        );

        // --- Phase 6: Verify snoozedInstances cleared ---
        log.info(`[${scenarioName}] Phase 6: Verifying snoozed_instances cleared on each rule...`);
        for (const ruleId of ruleIds) {
          const { body: rule } = await supertest
            .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
            .expect(200);
          expect((rule.snoozed_instances ?? []).length).to.be(0);
        }
        log.info(`[${scenarioName}] Phase 6 complete: all rules have empty snoozed_instances`);

        // --- Phase 7: Verify ALERT_MUTED cleared on real AAD docs ---
        log.info(`[${scenarioName}] Phase 7: Verifying ALERT_MUTED=false on AAD docs...`);
        for (const ruleId of ruleIds) {
          await retry.tryForTime(30000, async () => {
            const alerts = await getAlertsByRuleId(ruleId);
            for (const alert of alerts) {
              expect((alert as any)._source[ALERT_MUTED]).to.be(false);
            }
          });
        }
        log.info(`[${scenarioName}] Phase 7 complete: all real alerts show ALERT_MUTED=false`);

        // --- Summary ---
        log.info(`=== Performance Summary: ${scenarioName} ===`);
        log.info(
          `Rules: ${ruleCount}, Snoozes per rule: ${effectiveSnoozesPerRule}, Total snooze ops: ${totalInstances}`
        );
        log.info(
          `Snooze (conditional, nested writes):  ${snoozeDuration}ms total, ${(
            snoozeDuration / totalInstances
          ).toFixed(1)}ms/instance`
        );
        log.info(`Rule runs (post-run SO update):       ${runDuration}ms total`);
        log.info(
          `Unsnooze (remove nested entries):     ${unsnoozeDuration}ms total, ${(
            unsnoozeDuration / totalInstances
          ).toFixed(1)}ms/instance`
        );
      });
    });
  };

  describe('snooze/unsnooze performance', () => {
    // Breadth: many rules, few snoozed instances each — measures aggregate HTTP + SO throughput.
    // 100 rules x 10 alerts = 1000 snooze ops, each rule SO carries at most 10 nested docs.
    runPerfScenario({
      scenarioName: 'breadth (100 rules x 10 alerts)',
      ruleCount: 100,
      alertsPerRule: 10,
    });

    // Depth: few rules, many snoozed instances each — isolates nested write amplification.
    // Each rule gets 200 real alerts, all snoozed. Each successive _mute call on a rule
    // rewrites an ever-growing nested array (O(N^2) total hidden doc writes per rule).
    // Compare per-instance ms with the breadth scenario to see the cost scaling.
    runPerfScenario({
      scenarioName: 'depth (5 rules x 200 snoozes)',
      ruleCount: 5,
      alertsPerRule: 200,
    });
  });
}
