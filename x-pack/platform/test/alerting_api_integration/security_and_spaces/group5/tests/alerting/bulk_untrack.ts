/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { ALERT_STATUS, ALERT_UUID } from '@kbn/rule-data-utils';
import { getUrlPrefix, ObjectRemover, getTestRuleData, getEventLog } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { UserAtSpaceScenarios } from '../../../scenarios';

const alertAsDataIndex = '.internal.alerts-observability.test.alerts.alerts-default-000001';

export default function bulkUntrackTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const es = getService('es');

  const runSoon = async (id: string) => {
    return retry.try(async () => {
      await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/rule/${id}/_run_soon`)
        .set('kbn-xsrf', 'foo')
        .expect(204);
    });
  };

  describe('bulk untrack', () => {
    const objectRemover = new ObjectRemover(supertest);

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

    for (const scenario of UserAtSpaceScenarios) {
      describe(scenario.id, () => {
        it('should bulk mark alerts as untracked', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerting/rule`)
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
          objectRemover.add(scenario.space.id, createdRule.id, 'rule', 'alerting');

          await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: scenario.space.id,
              type: 'alert',
              id: createdRule.id,
              provider: 'alerting',
              actions: new Map([['active-instance', { equal: 2 }]]),
            });
          });

          await retry.try(async () => {
            const {
              hits: { hits: activeAlerts },
            } = await es.search({
              index: alertAsDataIndex,
              query: { match_all: {} },
            });

            activeAlerts.forEach((activeAlert: any) => {
              expect(activeAlert._source[ALERT_STATUS]).eql('active');
            });
          });

          const {
            hits: { hits: activeAlerts },
          } = await es.search({
            index: alertAsDataIndex,
            query: { match_all: {} },
          });

          const ids = activeAlerts.map((activeAlert: any) => activeAlert._source[ALERT_UUID]);

          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(scenario.space.id)}/internal/alerting/alerts/_bulk_untrack`)
            .set('kbn-xsrf', 'foo')
            .auth(scenario.user.username, scenario.user.password)
            .send({
              indices: [alertAsDataIndex],
              alert_uuids: ids,
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(403);
              break;
            case 'superuser at space1':
              expect(response.statusCode).to.eql(204);
              await retry.try(async () => {
                const {
                  hits: { hits: untrackedAlerts },
                } = await es.search({
                  index: alertAsDataIndex,
                  query: { match_all: {} },
                });

                untrackedAlerts.forEach((untrackedAlert: any) => {
                  expect(untrackedAlert._source[ALERT_STATUS]).eql('untracked');
                });
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    describe('with more than 10 rule types', () => {
      // The index must start with .alerts- for the alerting internal user to access it
      const syntheticAlertsIndex = '.alerts-test.bulk-untrack-many-rule-types';
      const ruleTypeIds = [
        'test.always-firing',
        'test.cumulative-firing',
        'test.never-firing',
        'test.failing',
        'test.authorization',
        'test.delayed',
        'test.validation',
        'test.noop',
        'test.patternFiring',
        'test.throw',
      ];
      const fixtureAlertUuids = ruleTypeIds.flatMap((ruleTypeId) => [
        `${ruleTypeId}-alert-1`,
        `${ruleTypeId}-alert-2`,
      ]);
      const siemAlertUuid = 'siem-alert';

      const getAlertDoc = (ruleTypeId: string, consumer: string, alertUuid: string) => ({
        '@timestamp': new Date().toISOString(),
        'kibana.alert.uuid': alertUuid,
        'kibana.alert.status': 'active',
        'kibana.alert.rule.rule_type_id': ruleTypeId,
        'kibana.alert.rule.consumer': consumer,
        'kibana.alert.rule.uuid': `rule-${alertUuid}`,
        'kibana.alert.time_range': { gte: new Date().toISOString() },
        'kibana.space_ids': ['space1'],
      });

      const getAlertStatuses = async () => {
        const {
          hits: { hits },
        } = await es.search<Record<string, string>>({
          index: syntheticAlertsIndex,
          size: 100,
          query: { match_all: {} },
        });
        return Object.fromEntries(
          hits.map(({ _source }) => [_source?.[ALERT_UUID], _source?.[ALERT_STATUS]])
        );
      };

      beforeEach(async () => {
        await es.indices.create({
          index: syntheticAlertsIndex,
          settings: { hidden: true },
          mappings: {
            properties: {
              'kibana.alert.uuid': { type: 'keyword' },
              'kibana.alert.status': { type: 'keyword' },
              'kibana.alert.rule.rule_type_id': { type: 'keyword' },
              'kibana.alert.rule.consumer': { type: 'keyword' },
              'kibana.alert.rule.uuid': { type: 'keyword' },
              'kibana.space_ids': { type: 'keyword' },
            },
          },
        });
        // Two alerts per fixture rule type and a single siem alert, so that the siem rule type
        // is the 11th by alert count
        await es.bulk({
          index: syntheticAlertsIndex,
          refresh: 'wait_for',
          operations: [
            ...ruleTypeIds.flatMap((ruleTypeId) => [
              getAlertDoc(ruleTypeId, 'alertsFixture', `${ruleTypeId}-alert-1`),
              getAlertDoc(ruleTypeId, 'alertsFixture', `${ruleTypeId}-alert-2`),
            ]),
            getAlertDoc('siem.queryRule', 'siem', siemAlertUuid),
          ].flatMap((doc) => [{ index: {} }, doc]),
        });
      });

      afterEach(async () => {
        await es.indices.delete({ index: syntheticAlertsIndex, ignore_unavailable: true });
      });

      it('should not untrack any alert when a siem alert is among them', async () => {
        await supertest
          .post(`${getUrlPrefix('space1')}/internal/alerting/alerts/_bulk_untrack`)
          .set('kbn-xsrf', 'foo')
          .send({
            indices: [syntheticAlertsIndex],
            alert_uuids: [...fixtureAlertUuids, siemAlertUuid],
          })
          .expect(403);

        const statuses = await getAlertStatuses();
        expect(Object.values(statuses).every((status) => status === 'active')).to.be(true);
      });

      it('should untrack the alerts of all the rule types', async () => {
        await supertest
          .post(`${getUrlPrefix('space1')}/internal/alerting/alerts/_bulk_untrack`)
          .set('kbn-xsrf', 'foo')
          .send({
            indices: [syntheticAlertsIndex],
            alert_uuids: fixtureAlertUuids,
          })
          .expect(204);

        const statuses = await getAlertStatuses();
        fixtureAlertUuids.forEach((alertUuid) => {
          expect(statuses[alertUuid]).to.be('untracked');
        });
        expect(statuses[siemAlertUuid]).to.be('active');
      });
    });

    it('should create new alerts if run rules again after alerts are untracked', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix('space1')}/api/alerting/rule`)
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

      objectRemover.add('space1', createdRule.id, 'rule', 'alerting');

      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'space1',
          type: 'alert',
          id: createdRule.id,
          provider: 'alerting',
          actions: new Map([['active-instance', { equal: 2 }]]),
        });
      });

      const {
        hits: { hits: activeAlerts },
      } = await es.search({
        index: alertAsDataIndex,
        query: {
          bool: {
            filter: { term: { 'kibana.alert.rule.uuid': createdRule.id } },
          },
        },
      });

      const ids = activeAlerts.map((activeAlert: any) => activeAlert._source[ALERT_UUID]);

      await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/alerts/_bulk_untrack`)
        .set('kbn-xsrf', 'foo')
        .send({
          indices: [alertAsDataIndex],
          alert_uuids: ids,
        });

      await runSoon(createdRule.id);

      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'space1',
          type: 'alert',
          id: createdRule.id,
          provider: 'alerting',
          actions: new Map([['active-instance', { equal: 4 }]]),
        });
      });

      await retry.try(async () => {
        const {
          hits: { hits: alerts },
        } = await es.search({
          index: alertAsDataIndex,
          query: {
            bool: {
              filter: { term: { 'kibana.alert.rule.uuid': createdRule.id } },
            },
          },
        });

        const activeAlertsRemaining = [];
        const untrackedAlertsRemaining = [];

        alerts.forEach((alert: any) => {
          if (alert._source[ALERT_STATUS] === 'active') {
            activeAlertsRemaining.push(alert);
          } else {
            untrackedAlertsRemaining.push(alert);
          }
        });

        expect(activeAlertsRemaining.length).eql(2);
        expect(untrackedAlertsRemaining.length).eql(2);
      });
    });
  });
}
