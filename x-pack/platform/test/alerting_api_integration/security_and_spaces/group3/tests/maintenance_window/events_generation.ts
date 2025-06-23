/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import type { TaskManagerDoc } from '../../../../common/lib';
import { ObjectRemover } from '../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function eventsGenerationTaskTests({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  describe('Events Generation', () => {
    let differenceInDays: number;

    before(async () => {
      await createAndUpdateTestMaintenanceWindows();
    });
    afterEach(() => objectRemover.removeAll());

    it('should generate events for MWs expiring within 1 week', async () => {
      // Trigger task execution
      await runEventsGenerationTask();

      // verify task ran today
      await retry.try(async () => {
        const taskResult: TaskManagerDoc[] = await getTaskStatus();
        expect(taskResult.length).to.eql(1);

        const now = moment().utc();
        const runAt = taskResult[0].task.runAt;
        differenceInDays = now.diff(moment(runAt), 'days');

        expect(differenceInDays).to.be.eql(0);

        return taskResult;
      });

      // verify 2 maintenance windows are updated
      await retry.try(async () => {
        const maintenanceWindowsResult = await getUpdatedMaintenanceWindows();
        expect(maintenanceWindowsResult.length).to.eql(2);

        return maintenanceWindowsResult;
      });
    });

    const createAndUpdateTestMaintenanceWindows = async (): Promise<string[]> => {
      const maintenanceWindowIds: string[] = [];

      // Recurring which ends after a year
      const recurring1 = await createMaintenanceWindow({
        title: 'Test recurring 1',
        enabled: false,
        schedule: {
          custom: {
            duration: '1h',
            start: moment().utc().subtract(2, 'days').toISOString(),
            recurring: {
              every: '1d',
              end: moment().utc().add(1, 'year').toISOString(),
            },
          },
        },
      });

      // should be updated as expiration date is within 1 week
      await updateMaintenanceWindowSO({
        id: recurring1,
        expirationDate: moment().utc().add(6, 'days').toISOString(),
      });

      maintenanceWindowIds.push(recurring1);

      // Recurring which ends after 10 days
      const recurring2 = await createMaintenanceWindow({
        title: 'Test recurring 2',
        enabled: false,
        schedule: {
          custom: {
            duration: '20h',
            start: moment().utc().subtract(6, 'months').toISOString(),
            recurring: {
              every: '1w',
              onWeekDay: ['MO', 'FR'],
              end: moment().utc().add(1, 'day').toISOString(),
            },
          },
        },
      });

      // should be updated as expiration date is within 1 week
      await updateMaintenanceWindowSO({
        id: recurring2,
        expirationDate: moment().utc().add(2, 'days').toISOString(),
      });

      maintenanceWindowIds.push(recurring2);

      // non recurring
      const nonRecurring = await createMaintenanceWindow({
        title: 'Test non recurring',
        schedule: {
          custom: {
            duration: '3d',
            start: moment().utc().add(2, 'days').toISOString(),
          },
        },
      });

      // should not be updated as non recurring
      await updateMaintenanceWindowSO({
        id: nonRecurring,
        expirationDate: moment().utc().add(5, 'days').toISOString(),
      });

      maintenanceWindowIds.push(nonRecurring);

      // archived
      const archived = await createMaintenanceWindow(
        {
          title: 'Test archived',
          enabled: false,
          schedule: {
            custom: {
              duration: '1h',
              start: moment().utc().subtract(1, 'month').toISOString(),
              recurring: {
                every: '1M',
                occurrences: 10,
                onMonth: [2, 4, 6, 8, 10],
              },
            },
          },
        },
        true
      );

      // should not be updated as archived
      await updateMaintenanceWindowSO({
        id: archived,
        expirationDate: moment().utc().subtract(5, 'days').toISOString(),
      });

      maintenanceWindowIds.push(archived);

      // running
      const running = await createMaintenanceWindow({
        title: 'Test running',
        enabled: false,
        schedule: {
          custom: {
            duration: '8h',
            start: moment().utc().subtract(3, 'hours').toISOString(),
            recurring: {
              every: '1d',
              end: moment().utc().add(2, 'years').toISOString(),
              onMonthDay: [1, 15],
            },
          },
        },
      });

      // should not be updated as expiration date is more than 1 week away
      await updateMaintenanceWindowSO({
        id: running,
        expirationDate: moment().utc().add(10, 'days').toISOString(),
      });

      maintenanceWindowIds.push(running);

      return maintenanceWindowIds;
    };

    const createMaintenanceWindow = async (params: object, archive = false): Promise<string> => {
      const res = await supertest
        .post(`/api/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send(params)
        .expect(200);

      if (archive) {
        await supertest
          .post(`/api/maintenance_window/${res.body.id}/_archive`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      }
      return res.body.id;
    };

    async function updateMaintenanceWindowSO({
      id,
      expirationDate,
    }: {
      id: string;
      expirationDate: string;
    }) {
      await es.update({
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        id: `maintenance-window:${id}`,
        doc: {
          'maintenance-window': { expirationDate },
        },
      });
    }

    async function runEventsGenerationTask() {
      await supertest
        .post('/api/alerts_fixture/maintenance_window_events_generation/_run_soon')
        .set('kbn-xsrf', 'xxx')
        .expect(200);
    }

    // get maintenance windows which have expiration date after 1 year from today
    async function getUpdatedMaintenanceWindows() {
      const result = await es.search({
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        query: {
          bool: {
            filter: [
              { term: { type: 'maintenance-window' } },
              {
                range: {
                  'maintenance-window.expirationDate': {
                    gte: moment().utc().startOf('day').add(1, 'year').toISOString(),
                  },
                },
              },
            ],
          },
        },
      });

      return result.hits.hits.map((hit) => hit._source);
    }

    async function getTaskStatus(): Promise<TaskManagerDoc[]> {
      const result = await es.search({
        index: '.kibana_task_manager',
        query: {
          bool: {
            filter: [{ term: { 'task.taskType': 'maintenance-window:generate-events' } }],
          },
        },
      });

      return result.hits.hits.map((hit) => hit._source) as TaskManagerDoc[];
    }
  });
}
