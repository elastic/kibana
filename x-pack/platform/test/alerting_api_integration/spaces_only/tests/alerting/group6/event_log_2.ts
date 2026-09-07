/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import { get } from 'lodash';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import { ES_TEST_INDEX_NAME, ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';

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
import { InstanceActions } from '../validate_event';

export default function eventLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  // Failing: See https://github.com/elastic/kibana/issues/259686
  describe.skip('eventLog', () => {
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
        it('should generate expected events for flapping alerts that settle on active where notifyWhen is NOT set to "on status change"', async () => {
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
                notify_when: RuleNotifyWhen.THROTTLE,
                throttle: '1s',
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
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 18,
            totalAlertsGeneratedPerRun: [
              1, 2, 2, 3, 4, 5, 5, 6, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
            ],
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
                ['execute-action', { equal: 15 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { equal: 14 }],
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
          const result = [false, false, false, false, false].concat(
            new Array(9).fill(true),
            false,
            false,
            false
          );
          expect(flapping).to.eql(result);
        });

        it('should generate expected events for flapping alerts that settle on active where the action notifyWhen is NOT set to "on status change"', async () => {
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
                      notify_when: RuleNotifyWhen.ACTIVE,
                    },
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                    frequency: {
                      summary: false,
                      notify_when: RuleNotifyWhen.ACTIVE,
                    },
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 18,
            totalAlertsGeneratedPerRun: [
              1, 2, 2, 3, 4, 5, 5, 6, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
            ],
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
                ['execute-action', { equal: 15 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { equal: 14 }],
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
          const result = [false, false, false, false, false].concat(
            new Array(9).fill(true),
            false,
            false,
            false
          );
          expect(flapping).to.eql(result);
        });

        it('should generate expected events for flapping alerts that settle on recovered where notifyWhen is NOT set to "on status change"', async () => {
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
                throttle: '1s',
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
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 18,
            totalAlertsGeneratedPerRun: [
              1,
              2,
              2,
              3,
              4,
              5,
              5,
              6,
              6,
              7,
              ...new Array(3).fill(7),
              8,
              8,
              8,
              8,
              8,
            ],
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

        it('should generate expected events for flapping alerts that settle on recovered where the action notifyWhen is NOT set to "on status change"', async () => {
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
                      notify_when: RuleNotifyWhen.ACTIVE,
                    },
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                    frequency: {
                      summary: false,
                      notify_when: RuleNotifyWhen.ACTIVE,
                    },
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 18,
            totalAlertsGeneratedPerRun: [
              1,
              2,
              2,
              3,
              4,
              5,
              5,
              6,
              6,
              7,
              ...new Array(3).fill(7),
              8,
              8,
              8,
              8,
              8,
            ],
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

        it('should generate expected uuids for events for flapping alerts that go active while flapping and eventually recover', async () => {
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

          // flap and then recover, then active again
          const instance = [true, false, true, false, true].concat(
            ...new Array(6).fill(false),
            true
          );
          const pattern = { instance };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '24h' },
                throttle: null,
                params: { pattern },
                actions: [],
                notify_when: RuleNotifyWhen.CHANGE,
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 10,
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
                ['execute', { equal: 10 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { equal: 6 }],
                ['recovered-instance', { equal: 3 }],
              ]),
            });
          });

          let currentUuid: string | undefined;
          const seenUuids = new Set<string>();
          for (const event of events) {
            const action = event?.event?.action;
            const uuid = event?.kibana?.alert?.uuid;

            if (!InstanceActions.has(action)) continue;

            expect(uuid).to.be.ok();

            if (action === 'new-instance') {
              expect(currentUuid).to.be(undefined);
              expect(seenUuids.has(uuid!)).to.be(false);
              currentUuid = uuid;
              seenUuids.add(uuid!);
            } else if (action === 'active-instance') {
              expect(uuid).to.be(currentUuid);
            } else if (action === 'recovered-instance') {
              expect(uuid).to.be(currentUuid);
              currentUuid = undefined;
            }
          }
        });

        it('should generate expected events affected by active maintenance windows', async () => {
          // Create 2 active maintenance windows
          const { body: window1 } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send({
              title: 'test-maintenance-window-1',
              duration: 60 * 60 * 1000, // 1 hr
              r_rule: {
                dtstart: moment.utc().toISOString(),
                tzid: 'UTC',
                freq: 0, // yearly
                count: 1,
              },
            })
            .expect(200);
          objectRemover.add(space.id, window1.id, 'rules/maintenance_window', 'alerting', true);

          const { body: window2 } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send({
              title: 'test-maintenance-window-2',
              duration: 60 * 60 * 1000, // 1 hr
              r_rule: {
                dtstart: moment.utc().toISOString(),
                tzid: 'UTC',
                freq: 0, // yearly
                count: 1,
              },
            })
            .expect(200);
          objectRemover.add(space.id, window2.id, 'rules/maintenance_window', 'alerting', true);

          // Create 1 inactive maintenance window
          const { body: window3 } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send({
              title: 'test-maintenance-window-3',
              duration: 60 * 60 * 1000, // 1 hr
              r_rule: {
                dtstart: moment.utc().add(1, 'day').toISOString(),
                tzid: 'UTC',
                freq: 0, // yearly
                count: 1,
              },
            })
            .expect(200);
          objectRemover.add(space.id, window3.id, 'rules/maintenance_window', 'alerting', true);

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
                throttle: '1s',
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
                ['execute-start', { equal: 4 }],
                ['execute', { equal: 4 }],
                ['new-instance', { equal: 1 }],
                ['active-instance', { equal: 2 }],
                ['recovered-instance', { equal: 1 }],
              ]),
            });
          });

          const executeEvents = events.filter((event) => event?.event?.action === 'execute');

          // the first execute event should not have any maintenance window ids because there were no alerts during the
          // first execution
          for (let i = 0; i < executeEvents.length; i++) {
            if (i === 0) {
              expect(executeEvents[i]?.kibana?.alert?.maintenance_window_ids).to.be(undefined);
            } else {
              const alertMaintenanceWindowIds =
                executeEvents[i]?.kibana?.alert?.maintenance_window_ids?.sort();
              expect(alertMaintenanceWindowIds).eql([window1.id, window2.id].sort());
            }
          }

          const actionsToCheck = ['new-instance', 'active-instance', 'recovered-instance'];
          events.forEach((event) => {
            if (actionsToCheck.includes(event?.event?.action || '')) {
              const alertMaintenanceWindowIds =
                event?.kibana?.alert?.maintenance_window_ids?.sort();
              expect(alertMaintenanceWindowIds).eql([window1.id, window2.id].sort());
            }
          });
        });

        it('should not fire summary actions during maintenance window', async () => {
          const { body: window } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send({
              title: 'test-maintenance-window-1',
              duration: 60 * 60 * 1000, // 1 hr
              r_rule: {
                dtstart: moment.utc().toISOString(),
                tzid: 'UTC',
                freq: 0, // yearly
                count: 1,
              },
            })
            .expect(200);
          objectRemover.add(space.id, window.id, 'rules/maintenance_window', 'alerting', true);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
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
            )
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          // get the events we're expecting
          await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: createdRule.id,
              provider: 'alerting',
              actions: new Map([
                ['execute-start', { equal: 1 }],
                ['execute', { equal: 1 }],
                ['active-instance', { equal: 2 }],
              ]),
            });
          });

          // Try to get actions, should fail
          let hasActions = false;
          try {
            await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: createdRule.id,
              provider: 'alerting',
              actions: new Map([['execute-action', { equal: 1 }]]),
            });
            hasActions = true;
          } catch (e) {
            hasActions = false;
          }

          expect(hasActions).eql(false);
        });

        it('should generate expected events with a alertDelay', async () => {
          // wait so cache expires so maintenance window from previous test will be cleared
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

          const ACTIVE_PATH = 'kibana.alert.rule.execution.metrics.alert_counts.active';
          const NEW_PATH = 'kibana.alert.rule.execution.metrics.alert_counts.new';
          const RECOVERED_PATH = 'kibana.alert.rule.execution.metrics.alert_counts.recovered';
          const ACTION_PATH = 'kibana.alert.rule.execution.metrics.number_of_triggered_actions';
          const DELAYED_PATH = 'kibana.alert.rule.execution.metrics.number_of_delayed_alerts';

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
            instance: [true, true, true, true, false, true],
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
                ],
                alert_delay: {
                  active: 3,
                },
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          await runRuleAndEnsureCompletion({
            runs: 6,
            totalAlertsGeneratedPerRun: [0, 0, 0, 0, 0, 1],
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
                ['execute-start', { equal: 6 }],
                ['execute', { equal: 6 }],
                ['execute-action', { equal: 1 }],
                ['new-instance', { equal: 1 }],
                ['active-instance', { equal: 2 }],
                ['recovered-instance', { equal: 1 }],
              ]),
            });
          });

          const executeEvents = events.filter((event) => event?.event?.action === 'execute');

          // first two executions do not create the active alert
          executeEvents.slice(0, 1).forEach((event) => {
            expect(get(event, ACTIVE_PATH)).to.be(0);
            expect(get(event, NEW_PATH)).to.be(0);
            expect(get(event, RECOVERED_PATH)).to.be(0);
            expect(get(event, ACTION_PATH)).to.be(0);
            expect(get(event, DELAYED_PATH)).to.be(1);
          });

          // third executions creates the delayed active alert and triggers actions
          expect(get(executeEvents[2], ACTIVE_PATH)).to.be(1);
          expect(get(executeEvents[2], NEW_PATH)).to.be(1);
          expect(get(executeEvents[2], RECOVERED_PATH)).to.be(0);
          expect(get(executeEvents[2], ACTION_PATH)).to.be(1);
          expect(get(executeEvents[2], DELAYED_PATH)).to.be(0);

          // fourth execution
          expect(get(executeEvents[3], ACTIVE_PATH)).to.be(1);
          expect(get(executeEvents[3], NEW_PATH)).to.be(0);
          expect(get(executeEvents[3], RECOVERED_PATH)).to.be(0);
          expect(get(executeEvents[3], ACTION_PATH)).to.be(0);
          expect(get(executeEvents[3], DELAYED_PATH)).to.be(0);

          // fifth recovered execution
          expect(get(executeEvents[4], ACTIVE_PATH)).to.be(0);
          expect(get(executeEvents[4], NEW_PATH)).to.be(0);
          expect(get(executeEvents[4], RECOVERED_PATH)).to.be(1);
          expect(get(executeEvents[4], ACTION_PATH)).to.be(0);
          expect(get(executeEvents[4], DELAYED_PATH)).to.be(0);

          // sixth execution does not create the active alert
          expect(get(executeEvents[5], ACTIVE_PATH)).to.be(0);
          expect(get(executeEvents[5], NEW_PATH)).to.be(0);
          expect(get(executeEvents[5], RECOVERED_PATH)).to.be(0);
          expect(get(executeEvents[5], ACTION_PATH)).to.be(0);
          expect(get(executeEvents[5], DELAYED_PATH)).to.be(1);
        });

        it('should update event log document fields', async () => {
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

          // Create a rule that will generate events
          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '24h' },
                throttle: null,
                params: {
                  pattern: {
                    instance: [true, false],
                  },
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

          // Get the events and find one to update
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([['execute', { equal: 1 }]]),
            });
          });

          expect(events.length).to.be.greaterThan(0);
          const eventToUpdate = events[0];

          // Prepare the update
          const fieldsToUpdate = {
            event: { kind: 'test_update' },
          };

          // Call the update API
          const updateResponse = await supertest
            .post(`${getUrlPrefix(space.id)}/_test/event_log/update_documents`)
            .set('kbn-xsrf', 'foo')
            .send({
              _id: eventToUpdate?._id,
              _index: eventToUpdate?._index,
              _seq_no: eventToUpdate?._seq_no,
              _primary_term: eventToUpdate?._primary_term,
              fieldsToUpdate,
            })
            .expect(200);

          expect(updateResponse.body.ok).to.be(true);

          // Verify the update by getting the event again
          await retry.try(async () => {
            const newResponse = await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([['execute', { equal: 1 }]]),
            });

            const updatedEvent = newResponse.find((event) => event?._id === eventToUpdate?._id);
            expect(updatedEvent).to.be.ok();
            expect(updatedEvent?.event?.kind).to.be('test_update');

            return response;
          });
        });
      });
    }
  });
}
