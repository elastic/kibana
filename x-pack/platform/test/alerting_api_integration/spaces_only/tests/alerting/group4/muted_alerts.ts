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
  ALERT_SNOOZE_EXPIRES_AT,
  ALERT_STATUS,
} from '@kbn/rule-data-utils';
import { nodeBuilder } from '@kbn/es-query';
import { Spaces } from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  AlertUtils,
  getEventLog,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
} from '../../../../common/lib';

const alertAsDataIndexPattern = '.internal.alerts-observability.test.alerts.alerts-default-*';

export default function createDisableRuleTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('mutedAlerts', () => {
    const objectRemover = new ObjectRemover(supertest);
    // Use getter methods to avoid strict 204 status check - API may return 200 or 204
    const alertUtils: AlertUtils = new AlertUtils({
      space: Spaces.space1,
      supertestWithoutAuth: supertest,
    });

    const createRule = async (overwrites: Record<string, unknown> = {}) => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.always-firing-alert-as-data',
            schedule: { interval: '24h' },
            throttle: undefined,
            notify_when: undefined,
            params: {
              index: ES_TEST_INDEX_NAME,
              reference: 'test',
            },
            ...overwrites,
          })
        )
        .expect(200);

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');
      return createdRule.id;
    };

    const getAlerts = async () => {
      await es.indices.refresh({ index: alertAsDataIndexPattern, ignore_unavailable: true });
      const {
        hits: { hits: alerts },
      } = await es.search({
        index: alertAsDataIndexPattern,
        ignore_unavailable: true,
        query: { match_all: {} },
      });

      return alerts;
    };

    const getAlertsByRuleId = async (ruleId: string): Promise<any[]> => {
      await es.indices.refresh({ index: alertAsDataIndexPattern, ignore_unavailable: true });
      const {
        hits: { hits: alerts },
      } = await es.search({
        index: alertAsDataIndexPattern,
        ignore_unavailable: true,
        query: {
          bool: {
            must: [{ term: { [ALERT_RULE_UUID]: ruleId } }, { term: { [ALERT_STATUS]: 'active' } }],
          },
        },
      });

      return alerts;
    };

    before(async () => {
      await esTestIndexTool.setup();
    });

    afterEach(async () => {
      await es.deleteByQuery({
        index: alertAsDataIndexPattern,
        query: {
          match_all: {},
        },
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
      await objectRemover.removeAll();
    });

    after(async () => {
      await esTestIndexTool.destroy();
    });

    it('should reflect muted alert instance ids in rule', async () => {
      const createdRule1 = await createRule();
      const createdRule2 = await createRule();

      // Trigger first execution so alerts are created (schedule is 24h)
      await alertUtils.runSoon(createdRule1);
      await alertUtils.runSoon(createdRule2);

      let alerts: any[] = [];

      await retry.try(async () => {
        alerts = await getAlerts();

        expect(alerts.length).greaterThan(2);
        alerts.forEach((activeAlert: any) => {
          expect(activeAlert._source[ALERT_STATUS]).eql('active');
        });
      });

      const alertFromRule1 = alerts.find(
        (alert: any) =>
          alert._source[ALERT_STATUS] === 'active' &&
          alert._source[ALERT_RULE_UUID] === createdRule1
      );

      await alertUtils.getMuteInstanceRequest(
        createdRule1,
        alertFromRule1._source['kibana.alert.instance.id']
      );

      const ruleUuids = [createdRule1, createdRule2];

      const filterNode = nodeBuilder.or(
        ruleUuids.map((id) => nodeBuilder.is('alert.id', `alert:${id}`))
      );
      const { body: rules } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
        .set('kbn-xsrf', 'foo')
        .send({
          filter: JSON.stringify(filterNode),
          fields: ['id', 'mutedInstanceIds'],
          page: 1,
          per_page: ruleUuids.length,
        });

      expect(rules.data.length).to.be(2);
      const mutedRule = rules.data.find((rule: { id: string }) => rule.id === createdRule1);
      expect(mutedRule.muted_alert_ids).to.contain(alertFromRule1._source[ALERT_INSTANCE_ID]);
    });

    it('should add a nonexistent alert instance id to muted_alert_ids if validation is false', async () => {
      const createdRule1 = await createRule();

      await alertUtils.getMuteInstanceRequest(createdRule1, 'nonexistent-instance-id');

      const ruleUuids = [createdRule1];

      const filterNode = nodeBuilder.or(
        ruleUuids.map((id) => nodeBuilder.is('alert.id', `alert:${id}`))
      );
      const { body: rules } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/_find`)
        .set('kbn-xsrf', 'foo')
        .send({
          filter: JSON.stringify(filterNode),
          fields: ['id', 'mutedInstanceIds'],
          page: 1,
          per_page: ruleUuids.length,
        });

      expect(rules.data.length).to.be(1);
      const mutedRule = rules.data.find((rule: { id: string }) => rule.id === createdRule1);
      expect(mutedRule.muted_alert_ids).to.eql(['nonexistent-instance-id']);
    });

    it('should set ALERT_MUTED field to true when muting an alert instance', async () => {
      const ruleId = await createRule();

      // Wait for alerts to be created
      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getAlertsByRuleId(ruleId);
        expect(alerts.length).greaterThan(0);
      });

      const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];

      expect(alerts[0]._source[ALERT_MUTED]).to.be(false);

      // Mute the alert instance
      await alertUtils.getMuteInstanceRequest(ruleId, alertInstanceId);

      // Run the rule to trigger reconciliation
      await alertUtils.runSoon(ruleId);

      // Wait for alert document to be updated
      await retry.try(async () => {
        const updatedAlerts = await getAlertsByRuleId(ruleId);
        const mutedAlert: any = updatedAlerts.find(
          (alert: any) => alert._source[ALERT_INSTANCE_ID] === alertInstanceId
        );
        expect(mutedAlert).to.not.be(undefined);
        expect(mutedAlert._source[ALERT_MUTED]).to.be(true);
      });
    });

    it('should set ALERT_MUTED field to false when unmuting an alert instance', async () => {
      const ruleId = await createRule();

      // Wait for alerts to be created
      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getAlertsByRuleId(ruleId);
        expect(alerts.length).greaterThan(0);
      });

      const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];

      // Mute the alert instance first
      await alertUtils.getMuteInstanceRequest(ruleId, alertInstanceId);

      // Run the rule to trigger reconciliation
      await alertUtils.runSoon(ruleId);

      // Wait for alert to be muted
      await retry.try(async () => {
        const mutedAlerts = await getAlertsByRuleId(ruleId);
        const mutedAlert: any = mutedAlerts.find(
          (alert: any) => alert._source[ALERT_INSTANCE_ID] === alertInstanceId
        );
        expect(mutedAlert._source[ALERT_MUTED]).to.be(true);
      });

      // Now unmute the alert instance (updates rule SO and AAD doc via updateByQuery with refresh)
      await alertUtils.getUnmuteInstanceRequest(ruleId, alertInstanceId);

      // Wait for alert document to reflect unmuted state
      await retry.try(async () => {
        const unmutedAlerts = await getAlertsByRuleId(ruleId);
        const unmutedAlert: any = unmutedAlerts.find(
          (alert: any) => alert._source[ALERT_INSTANCE_ID] === alertInstanceId
        );
        expect(unmutedAlert).to.not.be(undefined);
        expect(unmutedAlert._source[ALERT_MUTED]).to.be(false);
      });
    });

    it('should set ALERT_MUTED field to true for all alerts when muteAll is called', async () => {
      const ruleId = await createRule();

      // Wait for alerts to be created
      await retry.try(async () => {
        const alerts = await getAlertsByRuleId(ruleId);
        expect(alerts.length).greaterThan(0);
      });

      // Mute all alerts for the rule
      await alertUtils.getMuteAllRequest(ruleId);

      // Run the rule to trigger reconciliation
      await alertUtils.runSoon(ruleId);

      // Wait for all alert documents to be updated
      await retry.try(async () => {
        const alerts = await getAlertsByRuleId(ruleId);
        expect(alerts.length).greaterThan(0);
        alerts.forEach((alert: any) => {
          expect(alert._source[ALERT_MUTED]).to.be(true);
        });
      });
    });

    it('should set ALERT_MUTED field to false for all alerts when unmuteAll is called', async () => {
      const ruleId = await createRule();

      // Wait for alerts to be created
      await retry.try(async () => {
        const alerts = await getAlertsByRuleId(ruleId);
        expect(alerts.length).greaterThan(0);
      });

      // Mute all alerts first
      await alertUtils.getMuteAllRequest(ruleId);

      // Run the rule to trigger reconciliation
      await alertUtils.runSoon(ruleId);

      // Wait for alerts to be muted
      await retry.try(async () => {
        const alerts = await getAlertsByRuleId(ruleId);
        alerts.forEach((alert: any) => {
          expect(alert._source[ALERT_MUTED]).to.be(true);
        });
      });

      // Now unmute all
      await alertUtils.getUnmuteAllRequest(ruleId);

      // Run the rule to trigger reconciliation
      await alertUtils.runSoon(ruleId);

      // Wait for all alert documents to be updated
      await retry.try(async () => {
        const alerts = await getAlertsByRuleId(ruleId);
        expect(alerts.length).greaterThan(0);
        alerts.forEach((alert: any) => {
          expect(alert._source[ALERT_MUTED]).to.be(false);
        });
      });
    });

    it('should reconcile ALERT_MUTED field on rule execution if out of sync', async () => {
      const ruleId = await createRule();

      // Wait for alerts to be created
      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getAlertsByRuleId(ruleId);
        expect(alerts.length).greaterThan(0);
      });

      const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];

      // Mute the alert instance via API
      await alertUtils.getMuteInstanceRequest(ruleId, alertInstanceId);

      // Wait for mute to be reflected in the document (async updateByQuery with wait_for_completion: false)
      await retry.try(async () => {
        const mutedAlerts = await getAlertsByRuleId(ruleId);
        const mutedAlert: any = mutedAlerts.find(
          (alert: any) => alert._source[ALERT_INSTANCE_ID] === alertInstanceId
        );
        expect(mutedAlert._source[ALERT_MUTED]).to.be(true);
      });

      // Manually set the alert document to have incorrect muted state and verify it sticks
      // Wrap in retry because concurrent updates may cause version conflicts with conflicts: 'proceed'
      await retry.try(async () => {
        await es.updateByQuery({
          index: alertAsDataIndexPattern,
          conflicts: 'proceed',
          query: {
            bool: {
              must: [
                { term: { [ALERT_RULE_UUID]: ruleId } },
                { term: { [ALERT_INSTANCE_ID]: alertInstanceId } },
              ],
            },
          },
          script: {
            source: `ctx._source['${ALERT_MUTED}'] = false;`,
            lang: 'painless',
          },
          refresh: true,
        });

        // Verify the alert document is out of sync
        const outOfSyncAlerts = await getAlertsByRuleId(ruleId);
        const outOfSyncAlert: any = outOfSyncAlerts.find(
          (alert: any) => alert._source[ALERT_INSTANCE_ID] === alertInstanceId
        );
        expect(outOfSyncAlert._source[ALERT_MUTED]).to.be(false);
      });

      // Run the rule to trigger reconciliation
      await alertUtils.runSoon(ruleId);

      // Wait for reconciliation to fix the muted state
      await retry.try(async () => {
        const reconciledAlerts = await getAlertsByRuleId(ruleId);
        const reconciledAlert: any = reconciledAlerts.find(
          (alert: any) => alert._source[ALERT_INSTANCE_ID] === alertInstanceId
        );
        expect(reconciledAlert).to.not.be(undefined);
        expect(reconciledAlert._source[ALERT_MUTED]).to.be(true);
      });
    });

    it('should auto-unsnooze when time-based TTL expires', async () => {
      const ruleId = await createRule();

      // Wait for alerts to be created. The first execution may fail due to
      // shards not being available yet; runSoon retries until successful.
      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getAlertsByRuleId(ruleId);
        if (alerts.length === 0) {
          await alertUtils.runSoon(ruleId);
          throw new Error('No alerts yet, retrying...');
        }
      });

      const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];

      // Snooze with a short TTL (5s) so auto-unsnooze runs on the next execution after expiry
      const snoozeMs = 5000;
      const expiresAt = new Date(Date.now() + snoozeMs).toISOString();
      await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute`
        )
        .set('kbn-xsrf', 'foo')
        .send({ expires_at: expiresAt })
        .expect(204);

      // If the API returns snoozed_instances, validate the mute path wrote correctly
      const { body: ruleAfterMute } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
        .expect(200);
      if (Array.isArray(ruleAfterMute?.snoozed_instances)) {
        expect(ruleAfterMute.snoozed_instances).to.have.length(1);
        expect(ruleAfterMute.snoozed_instances[0].instance_id).to.eql(alertInstanceId);
        expect(ruleAfterMute.snoozed_instances[0].expires_at).to.eql(expiresAt);
      }

      // Run the rule so ALERT_MUTED is materialized on the alert doc
      await alertUtils.runSoon(ruleId);

      // Verify ALERT_MUTED is true after snooze
      await retry.try(async () => {
        const snoozedAlerts = await getAlertsByRuleId(ruleId);
        const snoozedAlert: any = snoozedAlerts.find(
          (a: any) => a._source[ALERT_INSTANCE_ID] === alertInstanceId
        );
        expect(snoozedAlert._source[ALERT_MUTED]).to.be(true);
      });

      // Wait for TTL to expire (wait past snooze TTL so auto-unsnooze is applied on next run)
      await new Promise((resolve) => setTimeout(resolve, snoozeMs + 2000));

      // Run again to trigger auto-unsnooze (remove from rule SO snoozedInstances + clear ALERT_MUTED)
      await alertUtils.runSoon(ruleId);

      // Wait for the execution to complete (runSoon returns before the task finishes)
      await retry.try(async () => {
        await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 3 }]]),
        });
      });

      // Allow the 3rd execution to finish writing to the alerts index
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Ensure the alerts index is refreshed so the search sees the updated ALERT_MUTED
      await es.indices.refresh({ index: alertAsDataIndexPattern, ignore_unavailable: true });

      // Verify ALERT_MUTED is false after auto-unsnooze (poll for index refresh)
      await retry.try(async () => {
        const unsnoozedAlerts = await getAlertsByRuleId(ruleId);
        const unsnoozedAlert: any = unsnoozedAlerts.find(
          (a: any) => a._source[ALERT_INSTANCE_ID] === alertInstanceId
        );
        expect(unsnoozedAlert).to.not.be(undefined);
        expect(unsnoozedAlert._source[ALERT_MUTED]).to.be(false);
      });
    });

    it('should keep alert snoozed across recovery and re-fire via rule SO', async () => {
      const patternAadIndex = '.internal.alerts-test.patternfiring.alerts-default-*';

      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiringAad',
            schedule: { interval: '1d' },
            throttle: null,
            params: {
              pattern: { alert1: [true, false, true] },
            },
            actions: [],
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      // Wait for alert doc to appear. The first execution may fail due to
      // shards not being available; runSoon retries until successful.
      await retry.try(async () => {
        const {
          hits: { hits },
        } = await es.search({
          index: patternAadIndex,
          ignore_unavailable: true,
          query: {
            bool: {
              must: [
                { term: { [ALERT_RULE_UUID]: createdRule.id } },
                { term: { [ALERT_INSTANCE_ID]: 'alert1' } },
              ],
            },
          },
        });
        if (hits.length === 0) {
          await alertUtils.runSoon(createdRule.id);
          throw new Error('No alerts yet, retrying...');
        }
      });

      // Snooze with far-future TTL (capture so we can assert on re-fired alert doc)
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      await supertest
        .post(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${
            createdRule.id
          }/alert/alert1/_mute?validate_alerts_existence=false`
        )
        .set('kbn-xsrf', 'foo')
        .send({ expires_at: expiresAt })
        .expect(204);

      // Run 2: alert recovers (pattern[1] = false)
      await alertUtils.runSoon(createdRule.id);
      await retry.try(async () => {
        await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: createdRule.id,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 2 }]]),
        });
      });

      // Run 3: alert re-fires (pattern[2] = true) -- new UUID, snooze from rule SO
      await alertUtils.runSoon(createdRule.id);
      await retry.try(async () => {
        await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: createdRule.id,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 3 }]]),
        });
      });

      // The re-fired alert (run 3) creates a new doc with status=active.
      // It should have ALERT_MUTED=true and snooze detail fields (e.g. expires_at)
      // materialized from the rule SO, since the new doc has no prior AAD document.
      await retry.try(async () => {
        await es.indices.refresh({ index: patternAadIndex, ignore_unavailable: true });
        const {
          hits: { hits },
        } = await es.search({
          index: patternAadIndex,
          ignore_unavailable: true,
          query: {
            bool: {
              must: [
                { term: { [ALERT_RULE_UUID]: createdRule.id } },
                { term: { [ALERT_INSTANCE_ID]: 'alert1' } },
                { term: { [ALERT_STATUS]: 'active' } },
              ],
            },
          },
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: 1,
        });
        expect(hits.length).to.be(1);
        const activeAlert: any = hits[0];
        expect(activeAlert._source[ALERT_MUTED]).to.be(true);
        expect(activeAlert._source[ALERT_SNOOZE_EXPIRES_AT]).to.eql(expiresAt);
      });

      // Cleanup
      await es.deleteByQuery({
        index: patternAadIndex,
        query: { match_all: {} },
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    it('should auto-unsnooze when rule has no actions and TTL expires', async () => {
      const ruleId = await createRule({ actions: [] });

      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getAlertsByRuleId(ruleId);
        if (alerts.length === 0) {
          await alertUtils.runSoon(ruleId);
          throw new Error('No alerts yet, retrying...');
        }
      });

      const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];
      const snoozeMs = 5000;
      const expiresAt = new Date(Date.now() + snoozeMs).toISOString();
      await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute`
        )
        .set('kbn-xsrf', 'foo')
        .send({ expires_at: expiresAt })
        .expect(204);

      await alertUtils.runSoon(ruleId);
      await retry.try(async () => {
        const snoozedAlerts = await getAlertsByRuleId(ruleId);
        const a = snoozedAlerts.find((x: any) => x._source[ALERT_INSTANCE_ID] === alertInstanceId);
        expect(a._source[ALERT_MUTED]).to.be(true);
      });

      await new Promise((resolve) => setTimeout(resolve, snoozeMs + 2000));
      await alertUtils.runSoon(ruleId);

      await retry.try(async () => {
        await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 3 }]]),
        });
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await es.indices.refresh({ index: alertAsDataIndexPattern, ignore_unavailable: true });

      const { body: ruleAfterRun } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
        .expect(200);
      const snoozedInstances = ruleAfterRun.snoozed_instances ?? [];
      expect(snoozedInstances.find((e: any) => e.instance_id === alertInstanceId)).to.be(undefined);

      await retry.try(async () => {
        const unsnoozedAlerts = await getAlertsByRuleId(ruleId);
        const a = unsnoozedAlerts.find(
          (x: any) => x._source[ALERT_INSTANCE_ID] === alertInstanceId
        );
        expect(a).to.not.be(undefined);
        expect(a._source[ALERT_MUTED]).to.be(false);
      });
    });

    it('should clear snooze and set ALERT_MUTED false when explicitly unmuting after conditional snooze', async () => {
      const ruleId = await createRule();
      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getAlertsByRuleId(ruleId);
        if (alerts.length === 0) {
          await alertUtils.runSoon(ruleId);
          throw new Error('No alerts yet');
        }
      });
      const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute`
        )
        .set('kbn-xsrf', 'foo')
        .send({ expires_at: expiresAt })
        .expect(204);

      await alertUtils.runSoon(ruleId);
      await retry.try(async () => {
        const a = (await getAlertsByRuleId(ruleId)).find(
          (x: any) => x._source[ALERT_INSTANCE_ID] === alertInstanceId
        );
        expect(a._source[ALERT_MUTED]).to.be(true);
      });

      await alertUtils.getUnmuteInstanceRequest(ruleId, alertInstanceId);

      const { body: rule } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
        .expect(200);
      expect(
        (rule.snoozed_instances ?? []).some((e: any) => e.instance_id === alertInstanceId)
      ).to.be(false);

      await retry.try(async () => {
        const unmutedAlerts = await getAlertsByRuleId(ruleId);
        const a = unmutedAlerts.find((x: any) => x._source[ALERT_INSTANCE_ID] === alertInstanceId);
        expect(a._source[ALERT_MUTED]).to.be(false);
      });
    });

    it('should transition from simple mute to conditional snooze on same instance', async () => {
      const ruleId = await createRule();
      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getAlertsByRuleId(ruleId);
        if (alerts.length === 0) {
          await alertUtils.runSoon(ruleId);
          throw new Error('No alerts yet');
        }
      });
      const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];

      await alertUtils.getMuteInstanceRequest(ruleId, alertInstanceId);
      let { body: rule } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
        .expect(200);
      expect(rule.muted_alert_ids).to.contain(alertInstanceId);
      expect(rule.snoozed_instances ?? []).to.have.length(0);

      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute`
        )
        .set('kbn-xsrf', 'foo')
        .send({ expires_at: expiresAt })
        .expect(204);

      rule = (await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`))
        .body;
      expect(rule.muted_alert_ids || []).not.to.contain(alertInstanceId);
      expect(rule.snoozed_instances).to.have.length(1);
      expect(rule.snoozed_instances[0].instance_id).to.eql(alertInstanceId);
      expect(rule.snoozed_instances[0].expires_at).to.eql(expiresAt);

      await alertUtils.runSoon(ruleId);
      await retry.try(async () => {
        const a = (await getAlertsByRuleId(ruleId)).find(
          (x: any) => x._source[ALERT_INSTANCE_ID] === alertInstanceId
        );
        expect(a._source[ALERT_MUTED]).to.be(true);
      });
    });

    it('should unmute an alert that is both simple-muted and conditional-snoozed in a single rule SO update', async () => {
      const ruleId = await createRule();
      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getAlertsByRuleId(ruleId);
        if (alerts.length === 0) {
          await alertUtils.runSoon(ruleId);
          throw new Error('No alerts yet');
        }
      });
      const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];

      // Step 1: Apply conditional snooze (adds to snoozedInstances)
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute`
        )
        .set('kbn-xsrf', 'foo')
        .send({ expires_at: expiresAt })
        .expect(204);

      // Step 2: Apply simple mute (additive -- adds to mutedInstanceIds)
      await alertUtils.getMuteInstanceRequest(ruleId, alertInstanceId);

      // Verify both are populated
      let { body: rule } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
        .expect(200);
      expect(rule.muted_alert_ids).to.contain(alertInstanceId);
      expect(
        (rule.snoozed_instances ?? []).some((e: any) => e.instance_id === alertInstanceId)
      ).to.be(true);

      // Step 3: Unmute -- should remove from both lists
      await alertUtils.getUnmuteInstanceRequest(ruleId, alertInstanceId);

      rule = (await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`))
        .body;
      expect(rule.muted_alert_ids || []).not.to.contain(alertInstanceId);
      expect(
        (rule.snoozed_instances ?? []).some((e: any) => e.instance_id === alertInstanceId)
      ).to.be(false);

      // Verify AAD doc is also unmuted
      await alertUtils.runSoon(ruleId);
      await retry.try(async () => {
        const unmutedAlerts = await getAlertsByRuleId(ruleId);
        const a = unmutedAlerts.find((x: any) => x._source[ALERT_INSTANCE_ID] === alertInstanceId);
        expect(a).to.not.be(undefined);
        expect(a._source[ALERT_MUTED]).to.be(false);
      });
    });

    it('should return 400 when applying conditional snooze to rule with muteAll', async () => {
      const ruleId = await createRule();
      await alertUtils.getMuteAllRequest(ruleId);
      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getAlertsByRuleId(ruleId);
        if (alerts.length === 0) {
          await alertUtils.runSoon(ruleId);
          throw new Error('No alerts yet');
        }
      });
      const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];
      const expiresAt = new Date(Date.now() + 86400000).toISOString();

      const { body, status } = await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute?validate_alerts_existence=false`
        )
        .set('kbn-xsrf', 'foo')
        .send({ expires_at: expiresAt });

      expect(status).to.eql(400);
      expect(body.message).to.contain('muteAll');
    });

    it('should return snoozed_instances with correct shape in GET rule (time-based)', async () => {
      const ruleId = await createRule();
      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getAlertsByRuleId(ruleId);
        if (alerts.length === 0) {
          await alertUtils.runSoon(ruleId);
          throw new Error('No alerts yet');
        }
      });
      const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute`
        )
        .set('kbn-xsrf', 'foo')
        .send({ expires_at: expiresAt })
        .expect(204);

      const { body: rule } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
        .expect(200);
      expect(rule.snoozed_instances).to.have.length(1);
      expect(rule.snoozed_instances[0].instance_id).to.eql(alertInstanceId);
      expect(rule.snoozed_instances[0].expires_at).to.eql(expiresAt);

      await alertUtils.getUnmuteInstanceRequest(ruleId, alertInstanceId);
      const { body: ruleAfterUnmute } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
        .expect(200);
      expect(
        (ruleAfterUnmute.snoozed_instances ?? []).filter(
          (e: any) => e.instance_id === alertInstanceId
        )
      ).to.have.length(0);
    });

    it('should return snoozed_instances with conditions and condition_operator in GET rule', async () => {
      const ruleId = await createRule();
      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getAlertsByRuleId(ruleId);
        if (alerts.length === 0) {
          await alertUtils.runSoon(ruleId);
          throw new Error('No alerts yet');
        }
      });
      const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];
      await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          conditions: [{ type: 'severity_equals', field: 'kibana.alert.severity', value: 'low' }],
          condition_operator: 'any',
        })
        .expect(204);

      const { body: rule } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
        .expect(200);
      expect(rule.snoozed_instances).to.have.length(1);
      expect(rule.snoozed_instances[0].instance_id).to.eql(alertInstanceId);
      expect(rule.snoozed_instances[0].conditions).to.have.length(1);
      expect(rule.snoozed_instances[0].conditions[0].type).to.eql('severity_equals');
      expect(rule.snoozed_instances[0].condition_operator).to.eql('any');
    });

    it('should log auto-unsnooze in event log when TTL expires', async () => {
      // Rule with no actions: same code path as "auto-unsnooze when no actions" and avoids
      // action connector cleanup races when asserting on the event log.
      const ruleId = await createRule({ actions: [] });
      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getAlertsByRuleId(ruleId);
        if (alerts.length === 0) {
          await alertUtils.runSoon(ruleId);
          throw new Error('No alerts yet');
        }
      });
      const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];
      const snoozeMs = 8000;
      const expiresAt = new Date(Date.now() + snoozeMs).toISOString();
      await supertest
        .post(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/alerting/rule/${ruleId}/alert/${alertInstanceId}/_mute`
        )
        .set('kbn-xsrf', 'foo')
        .send({ expires_at: expiresAt })
        .expect(204);
      await alertUtils.runSoon(ruleId);
      await new Promise((resolve) => setTimeout(resolve, snoozeMs + 4000));
      await alertUtils.runSoon(ruleId);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await alertUtils.runSoon(ruleId);

      await retry.try(async () => {
        const events = await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([
            ['execute', { gte: 3 }],
            ['auto-unsnooze', { gte: 1 }],
          ]),
        });
        const autoUnsnoozeEvents = events.filter((e: any) => e?.event?.action === 'auto-unsnooze');
        expect(autoUnsnoozeEvents.length).to.be.greaterThan(0);
      });
    });
  });
}
