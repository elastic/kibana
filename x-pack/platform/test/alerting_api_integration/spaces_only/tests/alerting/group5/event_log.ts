/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import type { IValidatedEvent, IValidatedEventInternalDocInfo } from '@kbn/event-log-plugin/server';
import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import { ES_TEST_INDEX_NAME, ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';

import { Spaces } from '../../../scenarios';
import {
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getEventLog,
  resetRulesSettings,
} from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { TEST_CACHE_EXPIRATION_TIME } from '../create_test_data';
import { runSoon } from '../../helpers';
import { validateEvent } from '../validate_event';

export default function eventLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('eventLog', () => {
    const objectRemover = new ObjectRemover(supertest);

    const runRuleAndEnsureCompletion = async ({
      spaceId,
      ruleId,
      runs,
      totalAlertsGeneratedPerRun = [],
    }: {
      spaceId: string;
      ruleId: string;
      runs: number;
      totalAlertsGeneratedPerRun?: number[];
    }) => {
      if (totalAlertsGeneratedPerRun.length && totalAlertsGeneratedPerRun.length !== runs) {
        throw new Error('Alerts per run has to be the same length as the number of runs');
      }
      for (let run = 0; run < runs; run++) {
        // Specifically check provider: actions if the expected alerts total has changed,
        // otherwise just check provider: alerting execute.
        const currentRunAlerts = totalAlertsGeneratedPerRun[run];
        const prevRunAlerts = totalAlertsGeneratedPerRun[run - 1];
        const shouldUseActionsProvider =
          !!totalAlertsGeneratedPerRun[run] && currentRunAlerts !== prevRunAlerts;
        // Skip the first run since creating the rule runs it already
        if (run !== 0) {
          await runSoon({
            id: ruleId,
            spaceId,
            supertest,
            retry,
          });
        }

        const provider = shouldUseActionsProvider ? 'actions' : 'alerting';
        const actions: Array<[string, { gte: number } | { equal: number }]> = [];
        if (shouldUseActionsProvider) {
          actions.push(['execute', { equal: totalAlertsGeneratedPerRun[run] }]);
        } else {
          actions.push(['execute', { equal: run + 1 }]);
          if (totalAlertsGeneratedPerRun[run]) {
            actions.push(['execute-action', { equal: totalAlertsGeneratedPerRun[run] }]);
          }
        }

        await retry.try(async () => {
          return await getEventLog({
            getService,
            spaceId,
            type: 'alert',
            id: ruleId,
            provider,
            actions: new Map(actions),
          });
        });
      }
    };

    beforeEach(async () => {
      await resetRulesSettings(supertest, Spaces.default.id);
      await resetRulesSettings(supertest, Spaces.space1.id);
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    after(async () => {
      await resetRulesSettings(supertest, Spaces.default.id);
      await resetRulesSettings(supertest, Spaces.space1.id);
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    for (const space of [Spaces.default, Spaces.space1]) {
      describe(`in space ${space.id}`, () => {
        it('should generate expected events for normal operation', async () => {
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

          // pattern of when the alert should fire
          const pattern = {
            instance: [false, true, true],
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '24h' },
                throttle: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 4,
            totalAlertsGeneratedPerRun: [0, 1, 2, 2],
            ruleId: alertId,
            spaceId: space.id,
          });

          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { equal: 4 }],
                ['execute', { equal: 4 }],
                ['execute-action', { equal: 2 }],
                ['new-instance', { equal: 1 }],
                ['active-instance', { equal: 2 }],
                ['recovered-instance', { equal: 1 }],
              ]),
            });
          });

          // get the filtered events only with action 'new-instance'
          const filteredEvents = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([['new-instance', { equal: 1 }]]),
              filter: 'event.action:(new-instance)',
            });
          });

          expect(getEventsByAction(filteredEvents, 'execute').length).equal(0);
          expect(getEventsByAction(filteredEvents, 'execute-action').length).equal(0);
          expect(getEventsByAction(events, 'new-instance').length).equal(1);

          const executeEvents = getEventsByAction(events, 'execute');
          const executeStartEvents = getEventsByAction(events, 'execute-start');
          const newInstanceEvents = getEventsByAction(events, 'new-instance');
          const recoveredInstanceEvents = getEventsByAction(events, 'recovered-instance');

          // make sure the events are in the right temporal order
          const executeTimes = getTimestamps(executeEvents);
          const executeStartTimes = getTimestamps(executeStartEvents);
          const newInstanceTimes = getTimestamps(newInstanceEvents);
          const recoveredInstanceTimes = getTimestamps(recoveredInstanceEvents);

          expect(executeTimes[0] < newInstanceTimes[0]).to.be(true);
          expect(executeTimes[1] >= newInstanceTimes[0]).to.be(true);
          expect(executeTimes[2] > newInstanceTimes[0]).to.be(true);
          expect(executeStartTimes.length === executeTimes.length).to.be(true);
          expect(recoveredInstanceTimes[0] > newInstanceTimes[0]).to.be(true);

          // validate each event
          let executeCount = 0;
          let numActiveAlerts = 0;
          let numNewAlerts = 0;
          let numRecoveredAlerts = 0;
          let currentExecutionId;
          const executionIds = [];
          const executeStatuses = ['ok', 'active', 'active'];
          for (const event of events) {
            switch (event?.event?.action) {
              case 'execute-start':
                currentExecutionId = event?.kibana?.alert?.rule?.execution?.uuid;
                executionIds.push(currentExecutionId);
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    {
                      type: RULE_SAVED_OBJECT_TYPE,
                      id: alertId,
                      rel: 'primary',
                      type_id: 'test.patternFiring',
                    },
                  ],
                  message: `rule execution start: "${alertId}"`,
                  shouldHaveTask: true,
                  ruleTypeId: response.body.rule_type_id,
                  executionId: currentExecutionId,
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                  },
                  consumer: 'alertsFixture',
                });
                break;
              case 'execute-action':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    {
                      type: RULE_SAVED_OBJECT_TYPE,
                      id: alertId,
                      rel: 'primary',
                      type_id: 'test.patternFiring',
                    },
                    { type: 'action', id: createdAction.id, type_id: 'test.noop' },
                  ],
                  message: `alert: test.patternFiring:${alertId}: 'abc' instanceId: 'instance' scheduled actionGroup: 'default' action: test.noop:${createdAction.id}`,
                  instanceId: 'instance',
                  actionGroupId: 'default',
                  executionId: currentExecutionId,
                  ruleTypeId: response.body.rule_type_id,
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                    name: response.body.name,
                  },
                  consumer: 'alertsFixture',
                });
                break;
              case 'new-instance':
                numNewAlerts++;
                validateInstanceEvent(
                  event,
                  `created new alert: 'instance'`,
                  false,
                  false,
                  currentExecutionId
                );
                break;
              case 'recovered-instance':
                numRecoveredAlerts++;
                validateInstanceEvent(
                  event,
                  `alert 'instance' has recovered`,
                  true,
                  false,
                  currentExecutionId
                );
                break;
              case 'active-instance':
                numActiveAlerts++;
                validateInstanceEvent(
                  event,
                  `active alert: 'instance' in actionGroup: 'default'`,
                  false,
                  false,
                  currentExecutionId
                );
                break;
              case 'execute':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    {
                      type: RULE_SAVED_OBJECT_TYPE,
                      id: alertId,
                      rel: 'primary',
                      type_id: 'test.patternFiring',
                    },
                  ],
                  outcome: 'success',
                  message: `rule executed: test.patternFiring:${alertId}: 'abc'`,
                  status: executeStatuses[executeCount++],
                  shouldHaveTask: true,
                  executionId: currentExecutionId,
                  ruleTypeId: response.body.rule_type_id,
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                    name: response.body.name,
                  },
                  consumer: 'alertsFixture',
                  numActiveAlerts,
                  numNewAlerts,
                  numRecoveredAlerts,
                });
                numActiveAlerts = 0;
                numNewAlerts = 0;
                numRecoveredAlerts = 0;
                break;
              // this will get triggered as we add new event actions
              default:
                throw new Error(`unexpected event action "${event?.event?.action}"`);
            }
          }

          const actionEvents = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'action',
              id: createdAction.id,
              provider: 'actions',
              actions: new Map([['execute', { equal: 2 }]]),
            });
          });

          function validateInstanceEvent(
            event: IValidatedEventInternalDocInfo,
            subMessage: string,
            shouldHaveEventEnd: boolean,
            flapping: boolean,
            executionId?: string
          ) {
            validateEvent(event, {
              spaceId: space.id,
              savedObjects: [
                {
                  type: RULE_SAVED_OBJECT_TYPE,
                  id: alertId,
                  rel: 'primary',
                  type_id: 'test.patternFiring',
                },
              ],
              message: `test.patternFiring:${alertId}: 'abc' ${subMessage}`,
              instanceId: 'instance',
              actionGroupId: 'default',
              shouldHaveEventEnd,
              executionId,
              ruleTypeId: response.body.rule_type_id,
              rule: {
                id: alertId,
                category: response.body.rule_type_id,
                license: 'basic',
                ruleset: 'alertsFixture',
                name: response.body.name,
              },
              consumer: 'alertsFixture',
              flapping,
            });
          }

          for (const event of actionEvents) {
            switch (event?.event?.action) {
              case 'execute':
                expect(event?.kibana?.alert?.rule?.execution?.uuid).not.to.be(undefined);
                expect(
                  executionIds.indexOf(event?.kibana?.alert?.rule?.execution?.uuid)
                ).to.be.greaterThan(-1);
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'action', id: createdAction.id, rel: 'primary', type_id: 'test.noop' },
                  ],
                  message: `action executed: test.noop:${createdAction.id}: MY action`,
                  outcome: 'success',
                  shouldHaveTask: true,
                  ruleTypeId: response.body.rule_type_id,
                  rule: { id: alertId },
                  consumer: 'alertsFixture',
                  source: 'alert',
                });
                break;
            }
          }
        });

        it('should generate expected events for summary actions', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'Test conn',
              connector_type_id: 'test.noop',
              config: {},
              secrets: {},
            })
            .expect(200);
          objectRemover.add(space.id, createdAction.id, 'connector', 'actions');

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.always-firing-alert-as-data',
                schedule: { interval: '10m' },
                throttle: undefined,
                notify_when: undefined,
                params: {
                  index: ES_TEST_INDEX_NAME,
                  reference: 'test',
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {
                      index: ES_TEST_INDEX_NAME,
                      reference: 'test',
                      message: '',
                    },
                    frequency: {
                      summary: true,
                      throttle: null,
                      notify_when: 'onActiveAlert',
                    },
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { equal: 1 }],
                ['execute', { equal: 1 }],
                ['active-instance', { equal: 2 }],
                ['execute-action', { equal: 1 }],
              ]),
            });
          });

          const executeActions = events.filter(
            (event) => event?.event?.action === 'execute-action'
          );

          expect(executeActions.length).to.be(1);

          const summary = executeActions[0]?.kibana?.alerting?.summary;
          expect(summary?.new?.count).to.be(2);
          expect(summary?.ongoing?.count).to.be(0);
          expect(summary?.recovered?.count).to.be(0);
        });

        it('should generate expected events for rules with multiple searches', async () => {
          const numSearches = 4;
          const delaySeconds = 2;

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.multipleSearches',
                schedule: { interval: '24h' },
                throttle: null,
                params: {
                  numSearches,
                  delay: `${delaySeconds}s`,
                },
                actions: [],
              })
            );

          expect(response.status).to.eql(200);
          const ruleId = response.body.id;
          objectRemover.add(space.id, ruleId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 4,
            spaceId: space.id,
            ruleId,
          });

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: ruleId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute', { equal: 4 }],
              ]),
            });
          });

          // validate each event
          let currentExecutionId;
          let numActiveAlerts = 0;
          let numNewAlerts = 0;
          let numRecoveredAlerts = 0;
          for (const event of events) {
            switch (event?.event?.action) {
              case 'execute-start':
                currentExecutionId = event?.kibana?.alert?.rule?.execution?.uuid;
                break;
              case 'new-instance':
                numNewAlerts++;
                break;
              case 'recovered-instance':
                numRecoveredAlerts++;
                break;
              case 'active-instance':
                numActiveAlerts++;
                break;
              case 'execute':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'alert', id: ruleId, rel: 'primary', type_id: 'test.multipleSearches' },
                  ],
                  outcome: 'success',
                  message: `rule executed: test.multipleSearches:${ruleId}: 'abc'`,
                  status: 'ok',
                  shouldHaveTask: true,
                  executionId: currentExecutionId,
                  numTriggeredActions: 0,
                  ruleTypeId: response.body.rule_type_id,
                  rule: {
                    id: ruleId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                    name: response.body.name,
                  },
                  consumer: 'alertsFixture',
                  numActiveAlerts,
                  numNewAlerts,
                  numRecoveredAlerts,
                });
                numActiveAlerts = 0;
                numNewAlerts = 0;
                numRecoveredAlerts = 0;
                expect(event?.kibana?.alert?.rule?.execution?.metrics?.number_of_searches).to.be(
                  numSearches
                );
                const esSearchDuration = Number(
                  event?.kibana?.alert?.rule?.execution?.metrics?.es_search_duration_ms
                );
                const totalSearchDuration = Number(
                  event?.kibana?.alert?.rule?.execution?.metrics?.total_search_duration_ms
                );

                expect(esSearchDuration).not.to.be(undefined);
                expect(totalSearchDuration).not.to.be(undefined);

                // Expect these searches to take time
                expect(esSearchDuration! > 0).to.be(true);
                expect(totalSearchDuration! > 0).to.be(true);

                // Total search duration should be greater since it includes any network latency
                expect(totalSearchDuration! - esSearchDuration! > 0).to.be(true);

                expect(
                  event?.kibana?.alert?.rule?.execution?.metrics?.claim_to_start_duration_ms
                ).to.be.greaterThan(0);
                expect(
                  event?.kibana?.alert?.rule?.execution?.metrics?.total_run_duration_ms
                ).to.be.greaterThan(0);
                expect(
                  event?.kibana?.alert?.rule?.execution?.metrics?.prepare_rule_duration_ms
                ).to.be.greaterThan(0);
                expect(
                  event?.kibana?.alert?.rule?.execution?.metrics?.rule_type_run_duration_ms
                ).to.be.greaterThan(0);
                expect(
                  // @ts-expect-error upgrade typescript v5.1.6
                  event?.kibana?.alert?.rule?.execution?.metrics?.process_alerts_duration_ms! >= 0
                ).to.be(true);
                expect(
                  // @ts-expect-error upgrade typescript v5.1.6
                  event?.kibana?.alert?.rule?.execution?.metrics?.trigger_actions_duration_ms! >= 0
                ).to.be(true);
                expect(
                  event?.kibana?.alert?.rule?.execution?.metrics?.process_rule_duration_ms
                ).to.be.greaterThan(0);
                break;
              // this will get triggered as we add new event actions
              default:
                throw new Error(`unexpected event action "${event?.event?.action}"`);
            }
          }
        });

        it('should generate events for execution errors', async () => {
          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.throw',
                schedule: { interval: '24h' },
                throttle: null,
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                ['execute-start', { equal: 1 }],
                ['execute', { equal: 1 }],
              ]),
            });
          });

          const executeEvents = getEventsByAction(events, 'execute');
          const executeStartEvents = getEventsByAction(events, 'execute-start');

          const startEvent = executeStartEvents[0];
          const executeEvent = executeEvents[0];

          expect(startEvent).to.be.ok();
          expect(executeEvent).to.be.ok();

          validateEvent(startEvent, {
            spaceId: space.id,
            savedObjects: [
              { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
            ],
            message: `rule execution start: "${alertId}"`,
            shouldHaveTask: true,
            ruleTypeId: response.body.rule_type_id,
            rule: {
              id: alertId,
              category: response.body.rule_type_id,
              license: 'basic',
              ruleset: 'alertsFixture',
            },
            consumer: 'alertsFixture',
          });

          validateEvent(executeEvent, {
            spaceId: space.id,
            savedObjects: [{ type: 'alert', id: alertId, rel: 'primary', type_id: 'test.throw' }],
            outcome: 'failure',
            message: `rule execution failure: test.throw:${alertId}: 'abc'`,
            errorMessage: 'this alert is intended to fail',
            status: 'error',
            reason: 'execute',
            shouldHaveTask: true,
            ruleTypeId: response.body.rule_type_id,
            rule: {
              id: alertId,
              category: response.body.rule_type_id,
              license: 'basic',
              ruleset: 'alertsFixture',
              name: 'abc',
            },
            consumer: 'alertsFixture',
            numActiveAlerts: 0,
            numNewAlerts: 0,
            numRecoveredAlerts: 0,
          });
        });

        it('should generate expected events for flapping alerts that settle on active', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false].concat(
            ...new Array(8).fill(true),
            false
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '24h' },
                throttle: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                  },
                ],
                notify_when: RuleNotifyWhen.CHANGE,
                alert_delay: {
                  active: 1,
                },
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 15,
            totalAlertsGeneratedPerRun: [1, 2, 2, 3, 4, 5, 5, 5, 5, ...new Array(6).fill(5)],
            ruleId: alertId,
            spaceId: space.id,
          });

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { equal: 15 }],
                ['execute', { equal: 15 }],
                ['execute-action', { equal: 5 }],
                ['active-instance', { equal: 12 }],
                ['new-instance', { equal: 3 }],
                ['recovered-instance', { equal: 2 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          const result = [false, false, false, false, false].concat(new Array(9).fill(true));
          expect(flapping).to.eql(result);
        });

        it('should generate expected events for flapping alerts that settle on active where the action notifyWhen is set to "on status change"', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false].concat(
            ...new Array(8).fill(true),
            false
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '24h' },
                throttle: null,
                notify_when: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                    frequency: {
                      summary: false,
                      throttle: null,
                      notify_when: RuleNotifyWhen.CHANGE,
                    },
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                    frequency: {
                      summary: false,
                      throttle: null,
                      notify_when: RuleNotifyWhen.CHANGE,
                    },
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 15,
            totalAlertsGeneratedPerRun: [1, 2, 2, 3, 4, 5, 5, 5, 5, ...new Array(6).fill(5)],
            ruleId: alertId,
            spaceId: space.id,
          });

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { equal: 15 }],
                ['execute', { equal: 15 }],
                ['execute-action', { equal: 5 }],
                ['active-instance', { equal: 12 }],
                ['new-instance', { equal: 3 }],
                ['recovered-instance', { equal: 2 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          const result = [false, false, false, false, false].concat(new Array(9).fill(true));
          expect(flapping).to.eql(result);
        });

        it('should generate expected events for flapping alerts settle on recovered', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false, true].concat(
            new Array(11).fill(false)
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '24h' },
                throttle: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                  },
                ],
                notify_when: RuleNotifyWhen.CHANGE,
                alert_delay: {
                  active: 1,
                },
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 14,
            totalAlertsGeneratedPerRun: [1, 2, 2, 3, 4, 5, 5, 5, 5, 5, ...new Array(3).fill(5), 6],
            ruleId: alertId,
            spaceId: space.id,
          });

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { equal: 14 }],
                ['execute', { equal: 14 }],
                ['execute-action', { equal: 6 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { equal: 10 }],
                ['recovered-instance', { equal: 3 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          expect(flapping).to.eql(
            [false, false, false, false, false].concat(new Array(8).fill(true))
          );
        });

        it('should generate expected events for flapping alerts settle on recovered where the action notifyWhen is set to "on status change"', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false, true].concat(
            new Array(11).fill(false)
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '24h' },
                throttle: null,
                notify_when: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                    frequency: {
                      summary: false,
                      throttle: null,
                      notify_when: RuleNotifyWhen.CHANGE,
                    },
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                    frequency: {
                      summary: false,
                      throttle: null,
                      notify_when: RuleNotifyWhen.CHANGE,
                    },
                  },
                ],
                alert_delay: {
                  active: 1,
                },
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 14,
            totalAlertsGeneratedPerRun: [1, 2, 2, 3, 4, 5, 5, 5, 5, 5, ...new Array(3).fill(5), 6],
            ruleId: alertId,
            spaceId: space.id,
          });

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { equal: 14 }],
                ['execute', { equal: 14 }],
                ['execute-action', { equal: 6 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { equal: 10 }],
                ['recovered-instance', { equal: 3 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          expect(flapping).to.eql(
            [false, false, false, false, false].concat(new Array(8).fill(true))
          );
        });

        it('should generate expected events for flapping alerts over a period of time longer than the look back', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 5,
              status_change_threshold: 5,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          const instance = [true, false, false, true, false, true, false, true, false].concat(
            ...new Array(8).fill(true),
            false
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '24h' },
                throttle: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                  },
                ],
                notify_when: RuleNotifyWhen.CHANGE,
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 18,
            totalAlertsGeneratedPerRun: [1, 2, 2, 3, 4, 5, 6, 7, ...new Array(9).fill(7), 8],
            ruleId: alertId,
            spaceId: space.id,
          });

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { equal: 18 }],
                ['execute', { equal: 18 }],
                ['execute-action', { equal: 8 }],
                ['new-instance', { equal: 4 }],
                ['active-instance', { equal: 13 }],
                ['recovered-instance', { equal: 4 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          const result = [false, false, false, false, false, false, false].concat(
            new Array(6).fill(true),
            false,
            false,
            false,
            false
          );
          expect(flapping).to.eql(result);
        });
      });
    }
  });
}

function getEventsByAction(events: IValidatedEvent[], action: string) {
  return events.filter((event) => event?.event?.action === action);
}

function getTimestamps(events: IValidatedEvent[]) {
  return events.map((event) => event?.['@timestamp'] ?? 'missing timestamp');
}
