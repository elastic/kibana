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
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_MUTED,
} from '@kbn/rule-data-utils';
import { nodeBuilder } from '@kbn/es-query';
import { Spaces } from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { AlertUtils, getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';

const alertAsDataIndex = '.internal.alerts-observability.test.alerts.alerts-default-000001';

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

    const createRule = async () => {
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
          })
        )
        .expect(200);

      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');
      return createdRule.id;
    };

    const getAlerts = async () => {
      const {
        hits: { hits: alerts },
      } = await es.search({
        index: alertAsDataIndex,
        query: { match_all: {} },
      });

      return alerts;
    };

    const getAlertsByRuleId = async (ruleId: string): Promise<any[]> => {
      const {
        hits: { hits: alerts },
      } = await es.search({
        index: alertAsDataIndex,
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
        index: alertAsDataIndex,
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

      // Now unmute the alert instance
      await alertUtils.getUnmuteInstanceRequest(ruleId, alertInstanceId);

      // Run the rule to trigger reconciliation
      await alertUtils.runSoon(ruleId);

      // Wait for alert document to be updated
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

      // Now unmute all alerts
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
          index: alertAsDataIndex,
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
  });
}
