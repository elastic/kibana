/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RULE_SAVED_OBJECT_TYPE, RuleNotifyWhen } from '@kbn/alerting-plugin/server';
import { ALERT_FLAPPING, ALERT_FLAPPING_HISTORY, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import type { SearchHit } from '@kbn/es-types';
import type { Alert } from '@kbn/alerts-as-data-utils/src/schemas';
import {
  SuperuserAtSpace1,
  UserAtSpaceScenarios,
  EnableDisableOnlyUserAtSpace1,
} from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import type { TaskManagerDoc } from '../../../../common/lib';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getUnauthorizedErrorMessage,
  resetRulesSettings,
} from '../../../../common/lib';

export default function createEnableAlertTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('enable', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    async function getScheduledTask(id: string): Promise<TaskManagerDoc> {
      const scheduledTask = await es.get<TaskManagerDoc>({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
      return scheduledTask._source!;
    }

    const ScenariosToTest = [...UserAtSpaceScenarios, EnableDisableOnlyUserAtSpace1];

    for (const scenario of ScenariosToTest) {
      const { user, space } = scenario;
      const alertUtils = new AlertUtils({ user, space, supertestWithoutAuth });

      describe(scenario.id, () => {
        it('should handle enable alert request appropriately', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'MY action',
              connector_type_id: 'test.noop',
              config: {},
              secrets: {},
            })
            .expect(200);

          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                enabled: false,
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                ],
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getEnableRequest(createdAlert.id);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('enable', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('enable', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to execute actions`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'enable_disable_only at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              const { body: updatedAlert } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
                .set('kbn-xsrf', 'foo')
                .auth(user.username, user.password)
                .expect(200);
              expect(typeof updatedAlert.scheduled_task_id).to.eql('string');
              const taskRecord = await getScheduledTask(updatedAlert.scheduled_task_id);
              expect(taskRecord.type).to.eql('task');
              expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
              expect(JSON.parse(taskRecord.task.params)).to.eql({
                alertId: createdAlert.id,
                spaceId: space.id,
                consumer: 'alertsFixture',
              });
              expect(taskRecord.task.enabled).to.eql(true);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: RULE_SAVED_OBJECT_TYPE,
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle enable alert request appropriately when consumer is the same as producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
                enabled: false,
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getEnableRequest(createdAlert.id);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'enable_disable_only at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'enable',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              try {
                await getScheduledTask(createdAlert.scheduled_task_id);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.meta.statusCode).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle enable alert request appropriately when consumer is not the producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.unrestricted-noop',
                consumer: 'alertsFixture',
                enabled: false,
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getEnableRequest(createdAlert.id);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'enable',
                  'test.unrestricted-noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'enable_disable_only at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle enable alert request appropriately when consumer is "alerts"', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.noop',
                consumer: 'alerts',
                enabled: false,
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getEnableRequest(createdAlert.id);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('enable', 'test.noop', 'alerts'),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'enable_disable_only at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              try {
                await getScheduledTask(createdAlert.scheduled_task_id);
                throw new Error('Should have removed scheduled task');
              } catch (e) {
                expect(e.meta.statusCode).to.eql(404);
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should still be able to enable alert when AAD is broken', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData({ enabled: false }))
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          await retry.try(async () => {
            await supertest
              .put(
                `${getUrlPrefix(space.id)}/api/alerts_fixture/saved_object/alert/${createdAlert.id}`
              )
              .set('kbn-xsrf', 'foo')
              .send({
                attributes: {
                  name: 'bar',
                },
              })
              .expect(200);
          });

          const response = await alertUtils.getEnableRequest(createdAlert.id);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('enable', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'enable_disable_only at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              const { body: updatedAlert } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
                .set('kbn-xsrf', 'foo')
                .auth(user.username, user.password)
                .expect(200);
              expect(typeof updatedAlert.scheduled_task_id).to.eql('string');
              const taskRecord = await getScheduledTask(updatedAlert.scheduled_task_id);
              expect(taskRecord.type).to.eql('task');
              expect(taskRecord.task.taskType).to.eql('alerting:test.noop');
              expect(JSON.parse(taskRecord.task.params)).to.eql({
                alertId: createdAlert.id,
                spaceId: space.id,
                consumer: 'alertsFixture',
              });
              expect(taskRecord.task.enabled).to.eql(true);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: RULE_SAVED_OBJECT_TYPE,
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't enable alert from another space`, async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix('other')}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData({ enabled: false }))
            .expect(200);
          objectRemover.add('other', createdAlert.id, 'rule', 'alerting');

          const response = await alertUtils.getEnableRequest(createdAlert.id);

          expect(response.statusCode).to.eql(404);
          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'superuser at space1':
            case 'enable_disable_only at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: `Saved object [alert/${createdAlert.id}] not found`,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    describe('Clearing flapping tests', () => {
      const { user, space } = SuperuserAtSpace1;
      const alertsAsDataIndex = '.alerts-test.patternfiring.alerts-default';
      const TEST_CACHE_EXPIRATION_TIME = 12000;

      const queryForAlertDocs = async <T>(ruleId: string): Promise<Array<SearchHit<T>>> => {
        const searchResult = await es.search({
          index: alertsAsDataIndex,
          sort: [{ '@timestamp': 'desc' }],
          query: {
            bool: {
              must: {
                term: { [ALERT_RULE_UUID]: { value: ruleId } },
              },
            },
          },
          size: 25,
        });
        return searchResult.hits.hits as Array<SearchHit<T>>;
      };

      const runSoon = async (id: String) => {
        return supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rule/${id}/_run_soon`)
          .set('kbn-xsrf', 'foo')
          .expect(204);
      };

      afterEach(async () => {
        await es.deleteByQuery({
          index: alertsAsDataIndex,
          query: {
            match_all: {},
          },
          conflicts: 'proceed',
          ignore_unavailable: true,
        });
        await objectRemover.removeAll();
        await resetRulesSettings(supertest, space.id);
      });

      it('should clear flapping history when enabling rules', async () => {
        const params = { pattern: { alertA: [true, false, true, false, true, false, true] } };

        await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
          .set('kbn-xsrf', 'foo')
          .auth('superuser', 'superuser')
          .send({
            enabled: true,
            look_back_window: 5,
            status_change_threshold: 2,
          })
          .expect(200);
        await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

        const rule = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              rule_type_id: 'test.patternFiringAad',
              schedule: { interval: '1d' },
              throttle: null,
              params,
              actions: [],
              notify_when: RuleNotifyWhen.CHANGE,
            })
          )
          .expect(200);

        objectRemover.add(space.id, rule.body.id, 'rule', 'alerting');

        for (let i = 0; i < 4; i++) {
          await retry.try(async () => {
            const alertDocs = await queryForAlertDocs<Alert>(rule.body.id);
            expect(alertDocs[0]?._source[ALERT_FLAPPING_HISTORY]?.length).eql(i + 1);
            if (i === 3) {
              return;
            }
            await runSoon(rule.body.id);
          });
        }

        let alertDocs = await queryForAlertDocs<Alert>(rule.body.id);
        expect(alertDocs[0]?._source[ALERT_FLAPPING_HISTORY]).eql([true, true, true, true]);
        expect(alertDocs[0]?._source[ALERT_FLAPPING]).eql(true);

        await supertestWithoutAuth
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule/${rule.body.id}/_disable`)
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password)
          .send()
          .expect(204);

        await supertestWithoutAuth
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule/${rule.body.id}/_enable`)
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password)
          .send()
          .expect(204);

        alertDocs = await queryForAlertDocs<Alert>(rule.body.id);
        expect(alertDocs[0]?._source[ALERT_FLAPPING_HISTORY]).eql([]);
        expect(alertDocs[0]?._source[ALERT_FLAPPING]).eql(false);
      });
    });
  });
}
