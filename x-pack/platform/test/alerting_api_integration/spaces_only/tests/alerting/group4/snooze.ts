/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { Spaces } from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getEventLog,
} from '../../../../common/lib';
import { runSoon } from '../../helpers';

const NOW = new Date().toISOString();
const snoozeSchedule = {
  schedule: {
    custom: {
      duration: '240h',
      start: NOW,
      recurring: {
        occurrences: 1,
      },
    },
  },
};

export default function createSnoozeRuleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');

  describe('snooze', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    const alertUtils = new AlertUtils({ space: Spaces.space1, supertestWithoutAuth });

    describe('handle snooze rule request appropriately', function () {
      this.tags('skipFIPS');
      it('should handle snooze rule request appropriately', async () => {
        const { body: createdConnector } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'MY Connector',
            connector_type_id: 'test.noop',
            config: {},
            secrets: {},
          })
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdConnector.id, 'connector', 'actions');

        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
              actions: [
                {
                  id: createdConnector.id,
                  group: 'default',
                  params: {},
                },
              ],
            })
          )
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send(snoozeSchedule);

        expect(response.statusCode).to.eql(200);
        expect(response.body).to.eql({
          schedule: {
            ...snoozeSchedule.schedule,
            id: response.body.schedule.id,
            custom: {
              ...snoozeSchedule.schedule.custom,
              duration: '240h',
              timezone: 'UTC',
            },
          },
        });
        const { body: updatedAlert } = await supertestWithoutAuth
          .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${createdRule.id}`)
          .set('kbn-xsrf', 'foo')
          .expect(200);
        expect(updatedAlert.snooze_schedule.length).to.eql(1);
        const { rRule, duration } = updatedAlert.snooze_schedule[0];
        expect(rRule.dtstart).to.eql(NOW);
        expect(duration).to.eql(864000000);
        expect(updatedAlert.mute_all).to.eql(false);
        // Ensure AAD isn't broken
        await checkAAD({
          supertest,
          spaceId: Spaces.space1.id,
          type: RULE_SAVED_OBJECT_TYPE,
          id: createdRule.id,
        });
      });
    });

    describe('should not trigger actions when snoozed', function () {
      this.tags('skipFIPS');
      it('should not trigger actions when snoozed', async () => {
        const { body: createdConnector, status: connStatus } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'MY Connector',
            connector_type_id: 'test.noop',
            config: {},
            secrets: {},
          });
        expect(connStatus).to.be(200);
        objectRemover.add(Spaces.space1.id, createdConnector.id, 'connector', 'actions');

        const { body: createdRule, status: ruleStatus } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              name: 'should not trigger actions when snoozed',
              rule_type_id: 'test.patternFiring',
              // Runs are triggered explicitly below. Keep the scheduled interval long so an
              // unrelated scheduled run cannot change the action count during the test.
              schedule: { interval: '24h' },
              throttle: null,
              notify_when: 'onActiveAlert',
              params: {
                pattern: { instance: arrayOfTrues(100) },
              },
              actions: [
                {
                  id: createdConnector.id,
                  group: 'default',
                  params: {},
                },
              ],
            })
          );
        expect(ruleStatus).to.be(200);
        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        // wait for initial execution and confirm action fired
        await waitForExecutions(createdRule.id, 1);
        await retry.try(async () => {
          await getEventLog({
            getService,
            spaceId: Spaces.space1.id,
            type: 'alert',
            id: createdRule.id,
            provider: 'alerting',
            actions: new Map([['execute-action', { gte: 1 }]]),
          });
        });
        const actionCountBeforeSnooze = await getExecuteActionEventCount(createdRule.id);
        expect(actionCountBeforeSnooze).to.be.greaterThan(0);

        // snooze the rule and retain the schedule ID for later removal
        const { body: snoozeBody } = await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send(snoozeSchedule)
          .expect(200);
        const snoozeId: string = snoozeBody.schedule.id;

        // run while snoozed — action must be suppressed
        await runSoon({ id: createdRule.id, supertest, retry });
        await waitForExecutions(createdRule.id, 2);
        const actionCountDuringSnooze = await getExecuteActionEventCount(createdRule.id);
        expect(actionCountDuringSnooze).to.eql(actionCountBeforeSnooze);

        // unsnooze and run again — action must fire
        await alertUtils.getUnsnoozeRequest(createdRule.id, snoozeId).expect(204);
        await runSoon({ id: createdRule.id, supertest, retry });
        await waitForExecutions(createdRule.id, 3);
        const actionCountAfterSnooze = await getExecuteActionEventCount(createdRule.id);
        expect(actionCountAfterSnooze).to.be.greaterThan(actionCountBeforeSnooze);
      });

      it('should resume actions automatically after snooze schedule expires', async () => {
        const { body: createdConnector, status: connStatus } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'MY Connector',
            connector_type_id: 'test.noop',
            config: {},
            secrets: {},
          });
        expect(connStatus).to.be(200);
        objectRemover.add(Spaces.space1.id, createdConnector.id, 'connector', 'actions');

        const { body: createdRule, status: ruleStatus } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              name: 'should resume actions after snooze expires',
              rule_type_id: 'test.patternFiring',
              schedule: { interval: '24h' },
              throttle: null,
              notify_when: 'onActiveAlert',
              params: {
                pattern: { instance: arrayOfTrues(100) },
              },
              actions: [
                {
                  id: createdConnector.id,
                  group: 'default',
                  params: {},
                },
              ],
            })
          );
        expect(ruleStatus).to.be(200);
        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        await waitForExecutions(createdRule.id, 1);
        await retry.try(async () => {
          await getEventLog({
            getService,
            spaceId: Spaces.space1.id,
            type: 'alert',
            id: createdRule.id,
            provider: 'alerting',
            actions: new Map([['execute-action', { gte: 1 }]]),
          });
        });
        const actionCountBeforeSnooze = await getExecuteActionEventCount(createdRule.id);
        expect(actionCountBeforeSnooze).to.be.greaterThan(0);

        // Use a short schedule in this test so natural expiry is exercised without a long wait.
        await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send({
            schedule: {
              custom: {
                duration: '10s',
                start: new Date().toISOString(),
                recurring: { occurrences: 1 },
              },
            },
          })
          .expect(200);

        // Do not call unsnooze here. Repeated runs are the expiry signal: early runs are suppressed,
        // then the first run after expiry clears the schedule and emits the action.
        await retry.tryForTime(30_000, async () => {
          await runSoon({ id: createdRule.id, supertest, retry });

          const actionCountAfterExpiry = await getExecuteActionEventCount(createdRule.id);
          expect(actionCountAfterExpiry).to.be.greaterThan(actionCountBeforeSnooze);
        });
      });
    });

    describe('prevent more than 5 schedules from being added to a rule', function () {
      this.tags('skipFIPS');
      it('should prevent more than 5 schedules from being added to a rule', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);
        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        // Creating 5 snooze schedules, using Promise.all is very flaky, therefore
        // the schedules are being created 1 at a time
        await alertUtils.getSnoozeRequest(createdRule.id).send(snoozeSchedule).expect(200);
        await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send({
            schedule: {
              custom: {
                duration: '20h',
                start: NOW,
                recurring: {
                  every: '1d',
                },
              },
            },
          })
          .expect(200);
        await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send({
            schedule: {
              custom: {
                duration: '24h',
                start: NOW,
                recurring: {
                  every: '1w',
                },
              },
            },
          })
          .expect(200);
        await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send({
            schedule: {
              custom: {
                duration: '20h',
                start: NOW,
                recurring: {
                  every: '1M',
                },
              },
            },
          })
          .expect(200);
        await alertUtils
          .getSnoozeRequest(createdRule.id)
          .send({
            schedule: {
              custom: {
                duration: '24h',
                start: NOW,
                recurring: {
                  every: '1y',
                },
              },
            },
          })
          .expect(200);
        // Adding the 6th snooze schedule, should fail
        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          schedule: {
            custom: {
              duration: '20h',
              start: NOW,
              recurring: {
                occurrences: 2,
              },
            },
          },
        });
        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql('Rule cannot have more than 5 snooze schedules');
      });
    });

    describe('validation', function () {
      this.tags('skipFIPS');
      it('should return 400 if the start is not valid', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          schedule: {
            custom: {
              start: 'invalid',
              duration: '240h',
            },
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          '[request body.schedule.custom.start]: Invalid schedule start date: invalid'
        );
      });

      it('should return 400 if the duration is not valid', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          schedule: {
            custom: {
              start: snoozeSchedule.schedule.custom.start,
              duration: 'invalid',
            },
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          '[request body.schedule.custom.duration]: Invalid schedule duration format: invalid'
        );
      });

      it('should return 400 if the duration is -1', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          schedule: {
            custom: {
              start: snoozeSchedule.schedule.custom.start,
              duration: '-1',
            },
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          '[request body.schedule.custom.duration]: Invalid schedule duration format: -1'
        );
      });

      it('should return 400 if the every is not valid', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          schedule: {
            custom: {
              ...snoozeSchedule.schedule.custom,
              recurring: {
                every: 'invalid',
              },
            },
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          `[request body.schedule.custom.recurring.every]: 'every' string of recurring schedule is not valid : invalid`
        );
      });

      it('should return 400 if the onWeekDay is not valid', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          schedule: {
            custom: {
              ...snoozeSchedule.schedule.custom,
              recurring: { onWeekDay: ['invalid'] },
            },
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          '[request body.schedule.custom.recurring.onWeekDay]: Invalid onWeekDay values in recurring schedule: invalid'
        );
      });

      it('should return 400 if the onMonthDay is not valid', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          schedule: {
            custom: {
              ...snoozeSchedule.schedule.custom,
              recurring: { onMonthDay: [35] },
            },
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          '[request body.schedule.custom.recurring.onMonthDay.0]: Value must be equal to or lower than [31].'
        );
      });

      it('should return 400 if the onMonth is not valid', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          schedule: {
            custom: {
              ...snoozeSchedule.schedule.custom,
              recurring: { onMonth: [14] },
            },
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          '[request body.schedule.custom.recurring.onMonth.0]: Value must be equal to or lower than [12].'
        );
      });

      it('should return 400 if the end date is not valid', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          schedule: {
            custom: {
              ...snoozeSchedule.schedule.custom,
              recurring: { end: 'invalid' },
            },
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          '[request body.schedule.custom.recurring.end]: Invalid schedule end date: invalid'
        );
      });

      it('should return 400 if the occurrences is not valid', async () => {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              enabled: false,
            })
          )
          .expect(200);

        objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

        const response = await alertUtils.getSnoozeRequest(createdRule.id).send({
          schedule: {
            custom: {
              ...snoozeSchedule.schedule.custom,
              recurring: { occurrences: 0 },
            },
          },
        });

        expect(response.statusCode).to.eql(400);
        expect(response.body.message).to.eql(
          '[request body.schedule.custom.recurring.occurrences]: Value must be equal to or greater than [1].'
        );
      });
    });
  });

  async function waitForExecutions(ruleId: string, minCount: number): Promise<void> {
    await retry.try(async () => {
      await getEventLog({
        getService,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: ruleId,
        provider: 'alerting',
        actions: new Map([['execute', { gte: minCount }]]),
      });
    });
  }

  async function getExecuteActionEventCount(ruleId: string): Promise<number> {
    const { body } = await supertest
      .get(`${getUrlPrefix(Spaces.space1.id)}/_test/event_log/alert/${ruleId}/_find?per_page=5000`)
      .expect(200);

    return (body.data as Array<{ event?: { action?: string; provider?: string } }>).filter(
      (ev) => ev?.event?.provider === 'alerting' && ev?.event?.action === 'execute-action'
    ).length;
  }
}

function arrayOfTrues(length: number) {
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push(true);
  }
  return result;
}
