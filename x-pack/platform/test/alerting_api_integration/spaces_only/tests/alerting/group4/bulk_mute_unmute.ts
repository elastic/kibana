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
import { Spaces } from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';

const alertAsDataIndex = '.internal.alerts-observability.test.alerts.alerts-default-000001';

export default function bulkMuteUnmuteTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  // Failing: See https://github.com/elastic/kibana/issues/246730
  describe.skip('bulkMuteUnmute', () => {
    const objectRemover = new ObjectRemover(supertest);

    const createRule = async (): Promise<string> => {
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

    const getActiveAlertsByRuleId = async (ruleId: string): Promise<any[]> => {
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

    const waitForAlerts = async (ruleId: string): Promise<any[]> => {
      let alerts: any[] = [];
      await retry.try(async () => {
        alerts = await getActiveAlertsByRuleId(ruleId);
        expect(alerts.length).greaterThan(0);
      });
      return alerts;
    };

    const getRule = async (ruleId: string): Promise<any> => {
      const { body: rule } = await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule/${ruleId}`)
        .set('kbn-xsrf', 'foo')
        .expect(200);
      return rule;
    };

    const bulkMuteAlerts = (rules: Array<{ rule_id: string; alert_instance_ids: string[] }>) =>
      supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/alerts/_bulk_mute`)
        .set('kbn-xsrf', 'foo')
        .send({ rules });

    const bulkUnmuteAlerts = (rules: Array<{ rule_id: string; alert_instance_ids: string[] }>) =>
      supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/alerts/_bulk_unmute`)
        .set('kbn-xsrf', 'foo')
        .send({ rules });

    before(async () => {
      await esTestIndexTool.setup();
    });

    afterEach(async () => {
      await es.deleteByQuery({
        index: alertAsDataIndex,
        query: { match_all: {} },
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
      await objectRemover.removeAll();
    });

    after(async () => {
      await esTestIndexTool.destroy();
    });

    describe('bulk mute', () => {
      it('should bulk mute alert instances for a single rule', async () => {
        const ruleId = await createRule();
        const alerts = await waitForAlerts(ruleId);
        const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];

        await bulkMuteAlerts([{ rule_id: ruleId, alert_instance_ids: [alertInstanceId] }]).expect(
          204
        );

        const rule = await getRule(ruleId);
        expect(rule.muted_alert_ids).to.contain(alertInstanceId);
      });

      it('should bulk mute alert instances across multiple rules', async () => {
        const ruleId1 = await createRule();
        const ruleId2 = await createRule();

        const alerts1 = await waitForAlerts(ruleId1);
        const alerts2 = await waitForAlerts(ruleId2);

        const alertInstanceId1 = alerts1[0]._source[ALERT_INSTANCE_ID];
        const alertInstanceId2 = alerts2[0]._source[ALERT_INSTANCE_ID];

        await bulkMuteAlerts([
          { rule_id: ruleId1, alert_instance_ids: [alertInstanceId1] },
          { rule_id: ruleId2, alert_instance_ids: [alertInstanceId2] },
        ]).expect(204);

        const rule1 = await getRule(ruleId1);
        const rule2 = await getRule(ruleId2);

        expect(rule1.muted_alert_ids).to.contain(alertInstanceId1);
        expect(rule2.muted_alert_ids).to.contain(alertInstanceId2);
      });

      it('should update ALERT_MUTED field on alert documents after rule execution', async () => {
        const ruleId = await createRule();
        const alerts = await waitForAlerts(ruleId);
        const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];

        expect(alerts[0]._source[ALERT_MUTED]).to.be(false);

        await bulkMuteAlerts([{ rule_id: ruleId, alert_instance_ids: [alertInstanceId] }]).expect(
          204
        );

        await retry.try(async () => {
          const updatedAlerts = await getActiveAlertsByRuleId(ruleId);
          const mutedAlert = updatedAlerts.find(
            (alert: any) => alert._source[ALERT_INSTANCE_ID] === alertInstanceId
          );
          expect(mutedAlert).to.not.be(undefined);
          expect(mutedAlert._source[ALERT_MUTED]).to.be(true);
        });
      });

      it('should mute multiple alert instances for a single rule', async () => {
        const ruleId = await createRule();
        const alerts = await waitForAlerts(ruleId);

        expect(alerts.length).greaterThan(1);

        const alertInstanceIds = alerts.map((alert: any) => alert._source[ALERT_INSTANCE_ID]);

        await bulkMuteAlerts([{ rule_id: ruleId, alert_instance_ids: alertInstanceIds }]).expect(
          204
        );

        const rule = await getRule(ruleId);
        alertInstanceIds.forEach((instanceId: string) => {
          expect(rule.muted_alert_ids).to.contain(instanceId);
        });
      });

      it('should allow muting nonexistent alert instance IDs', async () => {
        const ruleId = await createRule();
        await waitForAlerts(ruleId);

        await bulkMuteAlerts([
          { rule_id: ruleId, alert_instance_ids: ['nonexistent-instance-id'] },
        ]).expect(204);

        const rule = await getRule(ruleId);
        expect(rule.muted_alert_ids).to.contain('nonexistent-instance-id');
      });
    });

    describe('bulk unmute', () => {
      it('should bulk unmute alert instances for a single rule', async () => {
        const ruleId = await createRule();
        const alerts = await waitForAlerts(ruleId);
        const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];

        // First mute the alert
        await bulkMuteAlerts([{ rule_id: ruleId, alert_instance_ids: [alertInstanceId] }]).expect(
          204
        );

        let rule = await getRule(ruleId);
        expect(rule.muted_alert_ids).to.contain(alertInstanceId);

        // Now unmute
        await bulkUnmuteAlerts([{ rule_id: ruleId, alert_instance_ids: [alertInstanceId] }]).expect(
          204
        );

        rule = await getRule(ruleId);
        expect(rule.muted_alert_ids).to.not.contain(alertInstanceId);
      });

      it('should bulk unmute alert instances across multiple rules', async () => {
        const ruleId1 = await createRule();
        const ruleId2 = await createRule();

        const alerts1 = await waitForAlerts(ruleId1);
        const alerts2 = await waitForAlerts(ruleId2);

        const alertInstanceId1 = alerts1[0]._source[ALERT_INSTANCE_ID];
        const alertInstanceId2 = alerts2[0]._source[ALERT_INSTANCE_ID];

        // First mute both
        await bulkMuteAlerts([
          { rule_id: ruleId1, alert_instance_ids: [alertInstanceId1] },
          { rule_id: ruleId2, alert_instance_ids: [alertInstanceId2] },
        ]).expect(204);

        // Now unmute both
        await bulkUnmuteAlerts([
          { rule_id: ruleId1, alert_instance_ids: [alertInstanceId1] },
          { rule_id: ruleId2, alert_instance_ids: [alertInstanceId2] },
        ]).expect(204);

        const rule1 = await getRule(ruleId1);
        const rule2 = await getRule(ruleId2);

        expect(rule1.muted_alert_ids).to.not.contain(alertInstanceId1);
        expect(rule2.muted_alert_ids).to.not.contain(alertInstanceId2);
      });

      it('should update ALERT_MUTED field to false on alert documents after rule execution', async () => {
        const ruleId = await createRule();
        const alerts = await waitForAlerts(ruleId);
        const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];

        // Mute first
        await bulkMuteAlerts([{ rule_id: ruleId, alert_instance_ids: [alertInstanceId] }]).expect(
          204
        );

        await retry.try(async () => {
          const mutedAlerts = await getActiveAlertsByRuleId(ruleId);
          const mutedAlert = mutedAlerts.find(
            (alert: any) => alert._source[ALERT_INSTANCE_ID] === alertInstanceId
          );
          expect(mutedAlert._source[ALERT_MUTED]).to.be(true);
        });

        // Now unmute
        await bulkUnmuteAlerts([{ rule_id: ruleId, alert_instance_ids: [alertInstanceId] }]).expect(
          204
        );

        await retry.try(async () => {
          const unmutedAlerts = await getActiveAlertsByRuleId(ruleId);
          const unmutedAlert = unmutedAlerts.find(
            (alert: any) => alert._source[ALERT_INSTANCE_ID] === alertInstanceId
          );
          expect(unmutedAlert).to.not.be(undefined);
          expect(unmutedAlert._source[ALERT_MUTED]).to.be(false);
        });
      });

      it('should handle unmuting already unmuted alert instances gracefully', async () => {
        const ruleId = await createRule();
        const alerts = await waitForAlerts(ruleId);
        const alertInstanceId = alerts[0]._source[ALERT_INSTANCE_ID];

        // Unmute without prior mute - should succeed
        await bulkUnmuteAlerts([{ rule_id: ruleId, alert_instance_ids: [alertInstanceId] }]).expect(
          204
        );

        const rule = await getRule(ruleId);
        expect(rule.muted_alert_ids).to.eql([]);
      });
    });

    describe('validation', () => {
      it('should return 400 for invalid request body', async () => {
        await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/alerts/_bulk_mute`)
          .set('kbn-xsrf', 'foo')
          .send({ invalid: 'body' })
          .expect(400);
      });

      it('should return 400 for missing rule_id', async () => {
        await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/alerts/_bulk_mute`)
          .set('kbn-xsrf', 'foo')
          .send({ rules: [{ alert_instance_ids: ['test'] }] })
          .expect(400);
      });

      it('should return 400 for missing alert_instance_ids', async () => {
        await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/alerts/_bulk_mute`)
          .set('kbn-xsrf', 'foo')
          .send({ rules: [{ rule_id: 'test-rule' }] })
          .expect(400);
      });
    });
  });
}
