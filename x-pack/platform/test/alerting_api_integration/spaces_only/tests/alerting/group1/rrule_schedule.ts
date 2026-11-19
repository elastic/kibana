/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Frequency } from '@kbn/task-manager-plugin/server';
import { Spaces } from '../../../scenarios';
import type { TaskManagerDoc } from '../../../../common/lib';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

// 2099-01-05 is a Monday, so the first run is the DTSTART itself
const RRULE_WITH_DTSTART =
  'DTSTART;TZID=Europe/Rome:20990105T090000\nRRULE:FREQ=WEEKLY;BYHOUR=9;BYMINUTE=0;BYDAY=MO';
const TASK_RRULE_WITH_DTSTART = {
  freq: Frequency.WEEKLY,
  interval: 1,
  tzid: 'Europe/Rome',
  dtstart: '2099-01-05T08:00:00.000Z',
  byweekday: ['MO'],
  byhour: [9],
  byminute: [0],
};

const RRULE_WITHOUT_DTSTART = 'RRULE:FREQ=DAILY;INTERVAL=2;BYHOUR=6;BYMINUTE=30';
const TASK_RRULE_WITHOUT_DTSTART = {
  freq: Frequency.DAILY,
  interval: 2,
  tzid: 'UTC',
  byhour: [6],
  byminute: [30],
};

export default function rruleScheduleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');

  describe('rrule schedule', () => {
    const objectRemover = new ObjectRemover(supertest);
    const urlPrefix = getUrlPrefix(Spaces.space1.id);

    afterEach(() => objectRemover.removeAll());

    const getScheduledTask = async (id: string): Promise<TaskManagerDoc> => {
      const scheduledTask = await es.get<TaskManagerDoc>({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
      return scheduledTask._source!;
    };

    // A new task is idle until task manager claims it, and only idle tasks get their schedule
    // updated. Waiting for a runAt in the future makes sure the first run is done.
    const waitForFirstRun = async (id: string) =>
      await retry.try(async () => {
        const { task } = await getScheduledTask(id);
        if (task.status !== 'idle' || Date.parse(task.runAt) <= Date.now()) {
          throw new Error(`Expected task:${id} to have finished its first run`);
        }
      });

    const createRule = async (schedule: Record<string, string>) => {
      const { body } = await supertest
        .post(`${urlPrefix}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, body.id, 'rule', 'alerting');
      return body;
    };

    it('schedules the rule task with the DTSTART and its timezone', async () => {
      const rule = await createRule({ rrule: RRULE_WITH_DTSTART });
      expect(rule.schedule).to.eql({ rrule: RRULE_WITH_DTSTART });

      const { task } = await getScheduledTask(rule.scheduled_task_id);
      expect(task.schedule).to.eql({ rrule: TASK_RRULE_WITH_DTSTART });
      expect(task.runAt).to.eql('2099-01-05T08:00:00.000Z');

      const { body: fetchedRule } = await supertest
        .get(`${urlPrefix}/api/alerting/rule/${rule.id}`)
        .expect(200);
      expect(fetchedRule.schedule).to.eql({ rrule: RRULE_WITH_DTSTART });
    });

    it('schedules the rule task in UTC without a dtstart when DTSTART is missing', async () => {
      const rule = await createRule({ rrule: RRULE_WITHOUT_DTSTART });
      expect(rule.schedule).to.eql({ rrule: RRULE_WITHOUT_DTSTART });

      const { task } = await getScheduledTask(rule.scheduled_task_id);
      expect(task.schedule).to.eql({ rrule: TASK_RRULE_WITHOUT_DTSTART });

      // Task manager picks the next occurrence after now
      const runAt = new Date(task.runAt);
      expect(runAt.getTime()).to.be.greaterThan(Date.now());
      expect(runAt.getUTCHours()).to.eql(6);
      expect(runAt.getUTCMinutes()).to.eql(30);
    });

    it('ignores the RRULE parts that rules do not support', async () => {
      const rule = await createRule({ rrule: 'RRULE:FREQ=DAILY;BYHOUR=6;COUNT=3' });

      const { task } = await getScheduledTask(rule.scheduled_task_id);
      expect(task.schedule).to.eql({
        rrule: { freq: Frequency.DAILY, interval: 1, tzid: 'UTC', byhour: [6] },
      });
    });

    it('reschedules the rule task when updating from an interval to an rrule', async () => {
      const rule = await createRule({ interval: '1m' });
      await waitForFirstRun(rule.scheduled_task_id);

      const { body: updatedRule } = await supertest
        .put(`${urlPrefix}/api/alerting/rule/${rule.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: rule.name,
          tags: rule.tags,
          params: rule.params,
          schedule: { rrule: RRULE_WITH_DTSTART },
          actions: [],
          throttle: rule.throttle,
          notify_when: rule.notify_when,
        })
        .expect(200);
      expect(updatedRule.schedule).to.eql({ rrule: RRULE_WITH_DTSTART });

      const { task } = await getScheduledTask(rule.scheduled_task_id);
      expect(task.schedule).to.eql({ rrule: TASK_RRULE_WITH_DTSTART });
    });

    it('reschedules the rule task when bulk editing the schedule', async () => {
      const rule = await createRule({ interval: '1m' });
      await waitForFirstRun(rule.scheduled_task_id);

      const { body } = await supertest
        .post(`${urlPrefix}/internal/alerting/rules/_bulk_edit`)
        .set('kbn-xsrf', 'foo')
        .send({
          ids: [rule.id],
          operations: [
            { operation: 'set', field: 'schedule', value: { rrule: RRULE_WITHOUT_DTSTART } },
          ],
        })
        .expect(200);
      expect(body.rules[0].schedule).to.eql({ rrule: RRULE_WITHOUT_DTSTART });

      const { task } = await getScheduledTask(rule.scheduled_task_id);
      expect(task.schedule).to.eql({ rrule: TASK_RRULE_WITHOUT_DTSTART });
    });

    it('rejects an rrule with an unsupported frequency', async () => {
      const { body } = await supertest
        .post(`${urlPrefix}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { rrule: 'RRULE:FREQ=YEARLY' } }))
        .expect(400);
      expect(body.message).to.contain('Unsupported FREQ "YEARLY"');
    });
  });
}
