/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { schema } from '@kbn/config-schema';
import { times } from 'lodash';
import { TaskCost, TaskStatus } from '../task';
import type { TaskClaimingOpts } from '../queries/task_claiming';
import { TaskManagerPlugin, type TaskManagerStartContract } from '../plugin';
import { injectTask, setupTestServers, retry } from './lib';

const POLLING_INTERVAL = 5000;
const { TaskPollingLifecycle: TaskPollingLifecycleMock } = jest.requireMock('../polling_lifecycle');
jest.mock('../polling_lifecycle', () => {
  const actual = jest.requireActual('../polling_lifecycle');
  return {
    ...actual,
    TaskPollingLifecycle: jest.fn().mockImplementation((opts) => {
      return new actual.TaskPollingLifecycle(opts);
    }),
  };
});

const mockTaskTypeNormalCostRunFn = jest.fn();
const mockCreateTaskRunnerNormalCost = jest.fn();
const mockTaskTypeNormalCost = {
  title: 'Normal cost task',
  description: '',
  cost: TaskCost.Normal,
  stateSchemaByVersion: {
    1: {
      up: (state: Record<string, unknown>) => ({ foo: state.foo || '' }),
      schema: schema.object({
        foo: schema.string(),
      }),
    },
  },
  createTaskRunner: mockCreateTaskRunnerNormalCost.mockImplementation(() => ({
    run: mockTaskTypeNormalCostRunFn,
  })),
};
const mockTaskTypeXLCostRunFn = jest.fn();
const mockCreateTaskRunnerXLCost = jest.fn();
const mockTaskTypeXLCost = {
  title: 'XL cost task',
  description: '',
  cost: TaskCost.ExtraLarge,
  stateSchemaByVersion: {
    1: {
      up: (state: Record<string, unknown>) => ({ foo: state.foo || '' }),
      schema: schema.object({
        foo: schema.string(),
      }),
    },
  },
  createTaskRunner: mockCreateTaskRunnerXLCost.mockImplementation(() => ({
    run: mockTaskTypeXLCostRunFn,
  })),
};
jest.mock('../queries/task_claiming', () => {
  const actual = jest.requireActual('../queries/task_claiming');
  return {
    ...actual,
    TaskClaiming: jest.fn().mockImplementation((opts: TaskClaimingOpts) => {
      opts.definitions.registerTaskDefinitions({
        normalCostType: mockTaskTypeNormalCost,
        xlCostType: mockTaskTypeXLCost,
      });
      return new actual.TaskClaiming(opts);
    }),
  };
});

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');

describe('capacity based claiming', () => {
  const taskIdsToRemove: string[] = [];
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManagerPlugin: TaskManagerStartContract;

  beforeAll(async () => {
    const setupResult = await setupTestServers({
      xpack: {
        task_manager: {
          claim_strategy: `unsafe_mget`,
          capacity: 10,
          poll_interval: POLLING_INTERVAL,
          unsafe: {
            exclude_task_types: [
              'security*',
              'osquery*',
              'endpoint*',
              'apm*',
              'ML*',
              'task_manager*',
              'alert*',
              'action*',
              'cases*',
              'SLO*',
              'Fleet*',
              'fleet*',
              'session*',
              'dashboard*',
              'observability*',
            ],
          },
        },
      },
    });
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    taskManagerPlugin = taskManagerStartSpy.mock.results[0].value;

    expect(TaskPollingLifecycleMock).toHaveBeenCalledTimes(1);
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    while (taskIdsToRemove.length > 0) {
      const id = taskIdsToRemove.pop();
      await taskManagerPlugin.removeIfExists(id!);
    }
  });

  it('should claim tasks to full capacity', async () => {
    const taskRunAtDates: Date[] = [];
    mockTaskTypeNormalCostRunFn.mockImplementation(() => {
      taskRunAtDates.push(new Date());
      return { state: { foo: 'test' } };
    });

    // inject 10 normal cost tasks with the same runAt value
    const ids: string[] = [];
    times(10, () => ids.push(uuidV4()));

    const runAt = new Date();
    for (const id of ids) {
      await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
        id,
        taskType: 'normalCostType',
        params: {},
        state: { foo: 'test' },
        stateVersion: 1,
        runAt,
        enabled: true,
        scheduledAt: new Date(),
        attempts: 0,
        status: TaskStatus.Idle,
        startedAt: null,
        retryAt: null,
        ownerId: null,
      });
      taskIdsToRemove.push(id);
    }

    await retry(async () => {
      expect(mockTaskTypeNormalCostRunFn).toHaveBeenCalledTimes(10);
    });

    expect(taskRunAtDates.length).toBe(10);

    // run at dates should be within a few seconds of each other
    const firstRunAt = taskRunAtDates[0].getTime();
    const lastRunAt = taskRunAtDates[taskRunAtDates.length - 1].getTime();

    expect(lastRunAt - firstRunAt).toBeLessThanOrEqual(1000);
  });

  it('should claim tasks until the next task will exceed capacity', async () => {
    const now = new Date();
    const taskRunAtDates: Array<{ runAt: Date; type: string }> = [];
    mockTaskTypeNormalCostRunFn.mockImplementation(() => {
      taskRunAtDates.push({ type: 'normal', runAt: new Date() });
      return { state: { foo: 'test' } };
    });
    mockTaskTypeXLCostRunFn.mockImplementation(() => {
      taskRunAtDates.push({ type: 'xl', runAt: new Date() });
      return { state: { foo: 'test' } };
    });

    // inject 6 normal cost tasks for total cost of 12
    const ids: string[] = [];
    times(6, () => ids.push(uuidV4()));
    const runAt1 = new Date(now.valueOf() - 5);
    for (const id of ids) {
      await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
        id,
        taskType: 'normalCostType',
        params: {},
        state: { foo: 'test' },
        stateVersion: 1,
        runAt: runAt1,
        enabled: true,
        scheduledAt: new Date(),
        attempts: 0,
        status: TaskStatus.Idle,
        startedAt: null,
        retryAt: null,
        ownerId: null,
      });
      taskIdsToRemove.push(id);
    }

    // inject 1 XL cost task that will put us over the max cost capacity of 20
    const xlid = uuidV4();
    const runAt2 = now;
    await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
      id: xlid,
      taskType: 'xlCostType',
      params: {},
      state: { foo: 'test' },
      stateVersion: 1,
      runAt: runAt2,
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });
    taskIdsToRemove.push(xlid);

    // inject one more normal cost task
    const runAt3 = new Date(now.valueOf() + 5);
    const lastid = uuidV4();
    await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
      id: lastid,
      taskType: 'normalCostType',
      params: {},
      state: { foo: 'test' },
      stateVersion: 1,
      runAt: runAt3,
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });
    taskIdsToRemove.push(lastid);

    // retry until all tasks have been run
    await retry(async () => {
      expect(mockTaskTypeNormalCostRunFn).toHaveBeenCalledTimes(7);
      expect(mockTaskTypeXLCostRunFn).toHaveBeenCalledTimes(1);
    });

    expect(taskRunAtDates.length).toBe(8);

    const firstRunAt = taskRunAtDates[0].runAt.getTime();

    // the first 6 tasks should have been run at the same time (adding some fudge factor)
    // and they should all be normal cost tasks
    for (let i = 0; i < 6; i++) {
      expect(taskRunAtDates[i].type).toBe('normal');
      expect(taskRunAtDates[i].runAt.getTime() - firstRunAt).toBeLessThanOrEqual(500);
    }

    // the next task should be XL cost task and be run after one polling interval has passed (with some fudge factor)
    expect(taskRunAtDates[6].type).toBe('xl');
    expect(taskRunAtDates[6].runAt.getTime() - firstRunAt).toBeGreaterThan(POLLING_INTERVAL - 500);

    // last task should be normal cost and be run after one polling interval has passed
    expect(taskRunAtDates[7].type).toBe('normal');
    expect(taskRunAtDates[7].runAt.getTime() - firstRunAt).toBeGreaterThan(POLLING_INTERVAL - 500);
  });
});
