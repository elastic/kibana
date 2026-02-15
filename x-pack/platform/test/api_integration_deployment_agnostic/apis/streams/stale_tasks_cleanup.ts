/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TaskStatus } from '@kbn/streams-schema';
import { TaskClient } from '@kbn/streams-plugin/server/lib/tasks/task_client';
import {
  STALE_THRESHOLD_DAYS,
  STALE_TASKS_CLEANUP_TASK_TYPE,
} from '@kbn/streams-plugin/server/lib/tasks/stale_tasks_cleanup';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { disableStreams, enableStreams } from './helpers/requests';

const TASK_INDEX = '.kibana_streams_tasks';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  const esClient = getService('es');

  describe('Stale Tasks Cleanup', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('TaskClient.getLastActivity', () => {
      it('returns created_at when no other activity timestamps exist', () => {
        const task = {
          created_at: '2024-01-01T00:00:00.000Z',
        };
        const lastActivity = TaskClient.getLastActivity(task);
        expect(lastActivity.toISOString()).to.equal('2024-01-01T00:00:00.000Z');
      });

      it('returns the most recent timestamp when multiple exist', () => {
        const task = {
          created_at: '2024-01-01T00:00:00.000Z',
          last_completed_at: '2024-01-05T00:00:00.000Z',
          last_acknowledged_at: '2024-01-10T00:00:00.000Z',
          last_canceled_at: '2024-01-03T00:00:00.000Z',
        };
        const lastActivity = TaskClient.getLastActivity(task);
        expect(lastActivity.toISOString()).to.equal('2024-01-10T00:00:00.000Z');
      });

      it('returns last_failed_at when it is the most recent', () => {
        const task = {
          created_at: '2024-01-01T00:00:00.000Z',
          last_failed_at: '2024-01-15T00:00:00.000Z',
        };
        const lastActivity = TaskClient.getLastActivity(task);
        expect(lastActivity.toISOString()).to.equal('2024-01-15T00:00:00.000Z');
      });
    });

    describe('Stale threshold constant', () => {
      it('is set to 7 days', () => {
        expect(STALE_THRESHOLD_DAYS).to.equal(7);
      });
    });

    describe('Task type constant', () => {
      it('has the correct task type', () => {
        expect(STALE_TASKS_CLEANUP_TASK_TYPE).to.equal('streams:stale-tasks-cleanup');
      });
    });

    describe('Task storage operations', () => {
      const testTaskId = 'test-task-for-cleanup';

      afterEach(async () => {
        // Clean up test task
        try {
          await esClient.delete({
            index: TASK_INDEX,
            id: testTaskId,
            refresh: true,
          });
        } catch (e) {
          // Ignore if already deleted
        }
      });

      it('can create and retrieve a task from the task index', async () => {
        const now = new Date().toISOString();
        const taskDoc = {
          id: testTaskId,
          type: 'test-task',
          status: TaskStatus.Completed,
          space: 'default',
          created_at: now,
          last_completed_at: now,
          task: {
            params: {},
            payload: {},
          },
        };

        await esClient.index({
          index: TASK_INDEX,
          id: testTaskId,
          document: taskDoc,
          refresh: true,
        });

        const response = await esClient.get({
          index: TASK_INDEX,
          id: testTaskId,
        });

        expect(response._id).to.equal(testTaskId);
        expect(response._source).to.have.property('created_at', now);
        expect(response._source).to.have.property('last_completed_at', now);
      });

      it('can delete a task from the task index', async () => {
        const taskDoc = {
          id: testTaskId,
          type: 'test-task',
          status: TaskStatus.Completed,
          space: 'default',
          created_at: new Date().toISOString(),
          task: {
            params: {},
          },
        };

        await esClient.index({
          index: TASK_INDEX,
          id: testTaskId,
          document: taskDoc,
          refresh: true,
        });

        await esClient.delete({
          index: TASK_INDEX,
          id: testTaskId,
          refresh: true,
        });

        let deleted = false;
        try {
          await esClient.get({
            index: TASK_INDEX,
            id: testTaskId,
          });
        } catch (e: any) {
          if (e.statusCode === 404) {
            deleted = true;
          }
        }
        expect(deleted).to.be(true);
      });

      it('can search for tasks with activity timestamps', async () => {
        const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
        const taskDoc = {
          id: testTaskId,
          type: 'test-task',
          status: TaskStatus.Completed,
          space: 'default',
          created_at: eightDaysAgo,
          last_completed_at: eightDaysAgo,
          task: {
            params: {},
          },
        };

        await esClient.index({
          index: TASK_INDEX,
          id: testTaskId,
          document: taskDoc,
          refresh: true,
        });

        const response = await esClient.search({
          index: TASK_INDEX,
          query: {
            term: { _id: testTaskId },
          },
          _source: [
            'created_at',
            'last_completed_at',
            'last_acknowledged_at',
            'last_canceled_at',
            'last_failed_at',
          ],
        });

        expect(response.hits.hits.length).to.equal(1);
        const hit = response.hits.hits[0];
        expect(hit._id).to.equal(testTaskId);
        expect((hit._source as any).created_at).to.equal(eightDaysAgo);
        expect((hit._source as any).last_completed_at).to.equal(eightDaysAgo);
      });
    });

    describe('Stale task identification logic', () => {
      const staleTaskId = 'stale-task-test';
      const recentTaskId = 'recent-task-test';

      afterEach(async () => {
        // Clean up test tasks
        for (const id of [staleTaskId, recentTaskId]) {
          try {
            await esClient.delete({
              index: TASK_INDEX,
              id,
              refresh: true,
            });
          } catch (e) {
            // Ignore if already deleted
          }
        }
      });

      it('identifies tasks older than 7 days as stale', async () => {
        const now = new Date();
        const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

        // Create a stale task
        await esClient.index({
          index: TASK_INDEX,
          id: staleTaskId,
          document: {
            id: staleTaskId,
            type: 'test-task',
            status: TaskStatus.Completed,
            space: 'default',
            created_at: eightDaysAgo,
            last_completed_at: eightDaysAgo,
            task: { params: {} },
          },
          refresh: true,
        });

        // Create a recent task
        await esClient.index({
          index: TASK_INDEX,
          id: recentTaskId,
          document: {
            id: recentTaskId,
            type: 'test-task',
            status: TaskStatus.Completed,
            space: 'default',
            created_at: twoDaysAgo,
            last_completed_at: twoDaysAgo,
            task: { params: {} },
          },
          refresh: true,
        });

        // Search for all test tasks
        const response = await esClient.search({
          index: TASK_INDEX,
          query: {
            terms: { _id: [staleTaskId, recentTaskId] },
          },
          _source: [
            'created_at',
            'last_completed_at',
            'last_acknowledged_at',
            'last_canceled_at',
            'last_failed_at',
          ],
        });

        // Apply stale detection logic (same as in cleanupStaleTasks)
        const tasks = response.hits.hits.map((hit) => ({
          id: hit._id!,
          created_at: (hit._source as any).created_at,
          last_completed_at: (hit._source as any).last_completed_at,
          last_acknowledged_at: (hit._source as any).last_acknowledged_at,
          last_canceled_at: (hit._source as any).last_canceled_at,
          last_failed_at: (hit._source as any).last_failed_at,
        }));

        const staleTasks = tasks.filter((task) => {
          const lastActivity = TaskClient.getLastActivity(task);
          return lastActivity < staleThreshold;
        });

        const recentTasks = tasks.filter((task) => {
          const lastActivity = TaskClient.getLastActivity(task);
          return lastActivity >= staleThreshold;
        });

        expect(staleTasks.length).to.equal(1);
        expect(staleTasks[0].id).to.equal(staleTaskId);

        expect(recentTasks.length).to.equal(1);
        expect(recentTasks[0].id).to.equal(recentTaskId);
      });

      it('considers last_completed_at for activity determination', async () => {
        const now = new Date();
        // Task created 10 days ago but completed 2 days ago (not stale)
        const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

        await esClient.index({
          index: TASK_INDEX,
          id: recentTaskId,
          document: {
            id: recentTaskId,
            type: 'test-task',
            status: TaskStatus.Completed,
            space: 'default',
            created_at: tenDaysAgo,
            last_completed_at: twoDaysAgo,
            task: { params: {} },
          },
          refresh: true,
        });

        const response = await esClient.get({
          index: TASK_INDEX,
          id: recentTaskId,
        });

        const task = {
          id: response._id!,
          created_at: (response._source as any).created_at,
          last_completed_at: (response._source as any).last_completed_at,
        };

        const lastActivity = TaskClient.getLastActivity(task);

        // Task should NOT be stale because last_completed_at is recent
        expect(lastActivity >= staleThreshold).to.be(true);
      });

      it('considers last_acknowledged_at for activity determination', async () => {
        const now = new Date();
        // Task created and completed 10 days ago, but acknowledged 1 day ago (not stale)
        const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
        const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
        const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

        await esClient.index({
          index: TASK_INDEX,
          id: recentTaskId,
          document: {
            id: recentTaskId,
            type: 'test-task',
            status: TaskStatus.Acknowledged,
            space: 'default',
            created_at: tenDaysAgo,
            last_completed_at: tenDaysAgo,
            last_acknowledged_at: oneDayAgo,
            task: { params: {} },
          },
          refresh: true,
        });

        const response = await esClient.get({
          index: TASK_INDEX,
          id: recentTaskId,
        });

        const task = {
          id: response._id!,
          created_at: (response._source as any).created_at,
          last_completed_at: (response._source as any).last_completed_at,
          last_acknowledged_at: (response._source as any).last_acknowledged_at,
        };

        const lastActivity = TaskClient.getLastActivity(task);

        // Task should NOT be stale because last_acknowledged_at is recent
        expect(lastActivity >= staleThreshold).to.be(true);
      });
    });
  });
}
