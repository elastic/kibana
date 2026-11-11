/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { estypes } from '@elastic/elasticsearch';
import { taskMappings as TaskManagerMapping } from '@kbn/task-manager-plugin/server/saved_objects/mappings';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { RawDoc, SearchResults, SerializedConcreteTaskInstance } from './test_utils';
import { scheduleTask, currentTasks } from './test_utils';

const { properties: taskManagerIndexMapping } = TaskManagerMapping;

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const testHistoryIndex = '.kibana_task_manager_test_result';

  describe('task document version conflicts while running', () => {
    beforeEach(async () => {
      await supertest.delete('/api/sample_tasks').set('kbn-xsrf', 'xxx').expect(200);
      const exists = await es.indices.exists({ index: testHistoryIndex });
      if (exists) {
        await es.deleteByQuery({
          index: testHistoryIndex,
          refresh: true,
          query: { term: { type: 'task' } },
        });
      } else {
        await es.indices.create({
          index: testHistoryIndex,
          mappings: {
            properties: {
              type: {
                type: 'keyword',
              },
              taskId: {
                type: 'keyword',
              },
              params: taskManagerIndexMapping.params,
              state: taskManagerIndexMapping.state,
              runAt: taskManagerIndexMapping.runAt,
            } as Record<string, estypes.MappingProperty>,
          },
        });
      }
    });

    after(async () => {
      await supertest.delete('/api/sample_tasks').set('kbn-xsrf', 'xxx').expect(200);
    });

    function currentTask<State = unknown, Params = unknown>(
      taskId: string
    ): Promise<SerializedConcreteTaskInstance<State, Params>> {
      return supertest
        .get(`/api/sample_tasks/task/${taskId}`)
        .expect((response) => {
          expect(response.status).to.eql(200);
          expect(typeof JSON.parse(response.text).id).to.eql('string');
        })
        .then((response) => response.body);
    }

    function getTaskById<State = unknown, Params = unknown>(
      tasks: Array<SerializedConcreteTaskInstance<State, Params>>,
      id: string
    ) {
      return tasks.filter((task) => task.id === id)[0];
    }

    async function historyDocs(taskId?: string): Promise<RawDoc[]> {
      return es
        .search({
          index: testHistoryIndex,
          query: {
            term: { type: 'task' },
          },
        })
        .then((result) =>
          (result as unknown as SearchResults).hits.hits.filter((task) =>
            taskId ? task._source?.taskId === taskId : true
          )
        );
    }

    function releaseTasksWaitingForEventToComplete(event: string) {
      return supertest
        .post('/api/sample_tasks/event')
        .set('kbn-xsrf', 'xxx')
        .send({ event })
        .expect(200);
    }

    async function provideParamsToTasksWaitingForParams(
      taskId: string,
      data: Record<string, unknown> = {}
    ) {
      await retry.try(async () => {
        const tasks = (await currentTasks(supertest)).docs;
        expect(getTaskById(tasks, taskId).status).to.eql('running');
      });

      return supertest
        .post('/api/sample_tasks/event')
        .set('kbn-xsrf', 'xxx')
        .send({ event: taskId, data })
        .expect(200);
    }

    async function updateRunningTaskDocument(
      taskId: string,
      fields: Record<string, unknown>
    ): Promise<void> {
      await es.update({
        id: `task:${taskId}`,
        index: '.kibana_task_manager',
        refresh: true,
        doc: {
          task: fields,
        },
      });
    }

    async function scheduleLongRunningSampleTask(releaseEvent: string) {
      const scheduled = await scheduleTask(supertest, {
        taskType: 'sampleTask',
        schedule: { interval: '1h' },
        params: {
          waitForParams: true,
        },
      });

      await provideParamsToTasksWaitingForParams(scheduled.id, {
        waitForEvent: releaseEvent,
      });

      await retry.try(async () => {
        const docs = await historyDocs(scheduled.id);
        expect(docs.length).to.eql(1);

        const task = await currentTask(scheduled.id);
        expect(task.status).to.eql('running');
      });

      return scheduled;
    }

    it('retains schedule updated while running and writes the rest of the task-run fields', async () => {
      const releaseEvent = 'releaseScheduleConflict';
      const scheduled = await scheduleLongRunningSampleTask(releaseEvent);

      const newSchedule = { interval: '3h' };
      const newRunAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

      // Concurrent update while the task is still running: bump schedule/runAt and
      // poke state so we can prove the completed run's state wins on conflict resolve.
      await updateRunningTaskDocument(scheduled.id, {
        schedule: newSchedule,
        runAt: newRunAt,
        state: JSON.stringify({ count: 999 }),
      });

      await releaseTasksWaitingForEventToComplete(releaseEvent);

      await retry.try(async () => {
        const task = await currentTask<{ count: number }>(scheduled.id);

        expect(task.status).to.eql('idle');
        expect(task.schedule).to.eql(newSchedule);
        expect(task.runAt).to.eql(newRunAt);
        expect(task.state.count).to.eql(1);
        expect(task.startedAt).to.be(null);
        expect(task.retryAt).to.be(null);
        expect(task.ownerId).to.be(null);
        expect(task.attempts).to.eql(0);
      });
    });

    it('retains runAt updated while running and writes the rest of the task-run fields', async () => {
      const releaseEvent = 'releaseRunAtConflict';
      const scheduled = await scheduleLongRunningSampleTask(releaseEvent);

      const originalSchedule = { interval: '1h' };
      const newRunAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

      await updateRunningTaskDocument(scheduled.id, {
        runAt: newRunAt,
        state: JSON.stringify({ count: 999 }),
      });

      await releaseTasksWaitingForEventToComplete(releaseEvent);

      await retry.try(async () => {
        const task = await currentTask<{ count: number }>(scheduled.id);

        expect(task.status).to.eql('idle');
        expect(task.schedule).to.eql(originalSchedule);
        expect(task.runAt).to.eql(newRunAt);
        expect(task.state.count).to.eql(1);
        expect(task.startedAt).to.be(null);
        expect(task.retryAt).to.be(null);
        expect(task.ownerId).to.be(null);
        expect(task.attempts).to.eql(0);
      });
    });
  });
}
