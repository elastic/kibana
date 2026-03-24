/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { estypes } from '@elastic/elasticsearch';
import { taskMappings as TaskManagerMapping } from '@kbn/task-manager-plugin/server/saved_objects/mappings';
import { InstanceTaskCost } from '@kbn/task-manager-plugin/server';
import { asyncForEach } from '@kbn/std';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { RawDoc } from './test_utils';
import { scheduleTask, currentTasks, historyDocs } from './test_utils';

const { properties: taskManagerIndexMapping } = TaskManagerMapping;

// Used to block sampleTasks
const BLOCK_TASK_EVENT = 'block-task-event';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const testHistoryIndex = '.kibana_task_manager_test_result';

  describe('task cost', () => {
    beforeEach(async () => {
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
              taskType: {
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

    afterEach(async () => {
      await supertest.delete('/api/sample_tasks').set('kbn-xsrf', 'xxx').expect(200);
      await new Promise((r) => setTimeout(r, 10000));
      await supertest.delete('/api/sample_tasks').set('kbn-xsrf', 'xxx').expect(200);
    });

    it('should claim extra-large cost tasks when there is capacity', async () => {
      const tasksToSchedule = [];
      for (let i = 0; i < 5; i++) {
        tasksToSchedule.push(
          scheduleTask(supertest, {
            taskType: 'sampleTask',
            schedule: { interval: '1d' },
            params: {},
          })
        );
      }
      tasksToSchedule.push(
        scheduleTask(supertest, {
          taskType: 'extraLargeCostTask',
          schedule: { interval: '1d' },
          params: {},
        })
      );
      const scheduledTasks = await Promise.all(tasksToSchedule);

      await retry.try(async () => {
        const tasks = (await currentTasks(supertest)).docs;
        expect(tasks.length).to.eql(6);

        const taskIds = tasks.map((task) => task.id);
        const taskDocs: RawDoc[] = [];
        await asyncForEach(scheduledTasks, async (scheduledTask) => {
          expect(taskIds).to.contain(scheduledTask.id);
          const doc: RawDoc[] = await historyDocs({
            es,
            index: testHistoryIndex,
            taskId: scheduledTask.id,
          });
          expect(doc.length).to.eql(1);
          taskDocs.push(...doc);
        });

        expect(
          taskDocs.findIndex((taskDoc) => taskDoc._source.taskType === 'extraLargeCostTask')
        ).to.be.greaterThan(-1);
      });
    });

    it('should not claim extra-large cost tasks when there is no cost capacity', async () => {
      const blockingTasks = [];
      for (let i = 0; i < 10; i++) {
        blockingTasks.push(
          scheduleTask(supertest, {
            taskType: 'sampleTask',
            schedule: { interval: '1s' },
            params: {
              waitForEvent: BLOCK_TASK_EVENT,
            },
          })
        );
      }
      await Promise.all(blockingTasks);

      await retry.try(async () => {
        const allTaskDocs: RawDoc[] = await historyDocs({
          es,
          index: testHistoryIndex,
        });
        expect(allTaskDocs.length >= 10).to.be(true);
      });

      await scheduleTask(supertest, {
        taskType: 'extraLargeCostTask',
        schedule: { interval: '1s' },
        params: {},
      });

      // wait 30s to make sure the task had enough time to run and didn't
      // 30s is long enough for a task to be claimed, but short enough that it expires before the blocking tasks can free up capacity
      await new Promise((r) => setTimeout(r, 30000));

      const extraLargeDocs: RawDoc[] = await historyDocs({
        es,
        index: testHistoryIndex,
        taskType: 'extraLargeCostTask',
      });
      expect(extraLargeDocs.length).to.eql(0);
    });

    it('should claim extra-large type task with tiny instance cost override when only one worker slot remains', async () => {
      const blockingTasks = [];
      for (let i = 0; i < 9; i++) {
        blockingTasks.push(
          scheduleTask(supertest, {
            taskType: 'sampleTask',
            schedule: { interval: '1s' },
            params: {
              waitForEvent: BLOCK_TASK_EVENT,
            },
          })
        );
      }
      await Promise.all(blockingTasks);

      // Wait until all 9 blocking tasks are confirmed running before scheduling the tiny override task.
      await retry.try(async () => {
        const allTaskDocs: RawDoc[] = await historyDocs({
          es,
          index: testHistoryIndex,
        });
        expect(allTaskDocs.length >= 9).to.be(true);
      });

      // Schedule an extraLargeCostTask with a tiny instance cost override
      const overriddenTask = await scheduleTask(supertest, {
        taskType: 'extraLargeCostTask',
        schedule: { interval: '1s' },
        params: {},
        cost: InstanceTaskCost.Tiny,
      });

      expect(overriddenTask.cost).to.eql(InstanceTaskCost.Tiny);

      // Use a 30s window to verify that tiny task ran.
      // 30s is long enough for a tiny task to be claimed, but short enough that it expires before the blocking tasks can free up capacity
      await retry.tryForTime(30000, async () => {
        const extraLargeDocs: RawDoc[] = await historyDocs({
          es,
          index: testHistoryIndex,
          taskId: overriddenTask.id,
        });
        expect(extraLargeDocs.length).to.be.greaterThan(0);
      });
    });
  });
}
