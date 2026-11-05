/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { estypes } from '@elastic/elasticsearch';
import { taskMappings as TaskManagerMapping } from '@kbn/task-manager-plugin/server/saved_objects/mappings';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { RawDoc } from './test_utils';
import { scheduleTask, historyDocs } from './test_utils';

const { properties: taskManagerIndexMapping } = TaskManagerMapping;

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const testHistoryIndex = '.kibana_task_manager_test_result';

  async function getStoredCost(taskId: string): Promise<string | undefined> {
    const response = await es.get<{ task: { cost?: string } }>({
      index: '.kibana_task_manager',
      id: `task:${taskId}`,
    });
    return response._source?.task.cost;
  }

  async function getTask(taskId: string): Promise<ConcreteTaskInstance> {
    const response = await supertest.get(`/api/sample_tasks/task/${taskId}`).expect(200);
    return response.body;
  }

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
    });

    it('should use instance cost when set, overriding definition cost', async () => {
      const task = await scheduleTask(supertest, {
        taskType: 'extraLargeCostTask',
        schedule: { interval: '1d' },
        params: {},
        cost: TaskCost.Tiny,
      });

      expect(task.cost).to.eql(TaskCost.Tiny);
      expect(await getStoredCost(task.id)).to.eql('tiny');

      // check that the task ran
      await retry.try(async () => {
        const docs: RawDoc[] = await historyDocs({ es, index: testHistoryIndex, taskId: task.id });
        expect(docs.length).to.be.greaterThan(0);
      });
    });

    it('should use definition cost when instance cost is not set', async () => {
      const task = await scheduleTask(supertest, {
        taskType: 'extraLargeCostTask',
        schedule: { interval: '1d' },
        params: {},
      });

      expect(task.cost).to.eql(undefined);

      // check that the task ran
      await retry.try(async () => {
        const docs: RawDoc[] = await historyDocs({ es, index: testHistoryIndex, taskId: task.id });
        expect(docs.length).to.be.greaterThan(0);
      });
    });

    it('should use Normal cost by default when no instance or definition cost is set', async () => {
      const task = await scheduleTask(supertest, {
        taskType: 'sampleTask',
        schedule: { interval: '1d' },
        params: {},
      });

      expect(task.cost).to.eql(undefined);

      // check that the task ran
      await retry.try(async () => {
        const docs: RawDoc[] = await historyDocs({ es, index: testHistoryIndex, taskId: task.id });
        expect(docs.length).to.be.greaterThan(0);
      });
    });

    it('should use instance cost when set when no definition cost is set', async () => {
      const task = await scheduleTask(supertest, {
        taskType: 'sampleTask',
        schedule: { interval: '1d' },
        params: {},
        cost: TaskCost.ExtraLarge,
      });

      expect(task.cost).to.eql(TaskCost.ExtraLarge);
      expect(await getStoredCost(task.id)).to.eql('extralarge');

      // check that the task ran
      await retry.try(async () => {
        const docs: RawDoc[] = await historyDocs({ es, index: testHistoryIndex, taskId: task.id });
        expect(docs.length).to.be.greaterThan(0);
      });
    });

    it('ensure task with a stored cost it does not recognize is run', async () => {
      const task = await scheduleTask(supertest, {
        taskType: 'sampleTask',
        schedule: { interval: '1d' },
        params: {},
        enabled: false,
      });

      // simulate a cost tier written by a newer version of Kibana, then let the task be claimed
      await es.update({
        index: '.kibana_task_manager',
        id: `task:${task.id}`,
        refresh: true,
        doc: { task: { cost: 'huge', enabled: true } },
      });

      // check that the task ran
      await retry.try(async () => {
        const docs: RawDoc[] = await historyDocs({ es, index: testHistoryIndex, taskId: task.id });
        expect(docs.length).to.be.greaterThan(0);
      });

      expect(await getTask(task.id)).not.to.have.property('cost');
      // updates after the run merge into the stored task, so the unknown cost is kept for newer versions
      expect(await getStoredCost(task.id)).to.eql('huge');
    });
  });
}
