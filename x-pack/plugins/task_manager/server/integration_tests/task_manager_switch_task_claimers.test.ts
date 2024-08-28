/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import { SerializedConcreteTaskInstance, TaskStatus } from '../task';
import type { TaskClaimingOpts } from '../queries/task_claiming';
import { injectTask, setupTestServers, retry } from './lib';
import { setupKibanaServer } from './lib/setup_test_servers';

const mockTaskTypeRunFn = jest.fn();
const mockCreateTaskRunner = jest.fn();
const mockTaskType = {
  title: '',
  description: '',
  stateSchemaByVersion: {
    1: {
      up: (state: Record<string, unknown>) => ({ ...state, baz: state.baz || '' }),
      schema: schema.object({
        foo: schema.string(),
        bar: schema.string(),
        baz: schema.string(),
      }),
    },
  },
  createTaskRunner: mockCreateTaskRunner.mockImplementation(() => ({
    run: mockTaskTypeRunFn,
  })),
};
const { TaskClaiming: TaskClaimingMock } = jest.requireMock('../queries/task_claiming');
jest.mock('../queries/task_claiming', () => {
  const actual = jest.requireActual('../queries/task_claiming');
  return {
    ...actual,
    TaskClaiming: jest.fn().mockImplementation((opts: TaskClaimingOpts) => {
      // We need to register here because once the class is instantiated, adding
      // definitions won't get claimed because of "partitionIntoClaimingBatches".
      opts.definitions.registerTaskDefinitions({
        fooType: mockTaskType,
      });
      return new actual.TaskClaiming(opts);
    }),
  };
});

describe('switch task claiming strategies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should switch from default to mget and still claim tasks', async () => {
    const setupResultDefault = await setupTestServers();
    const esServer = setupResultDefault.esServer;
    let kibanaServer = setupResultDefault.kibanaServer;
    let taskClaimingOpts: TaskClaimingOpts = TaskClaimingMock.mock.calls[0][0];

    expect(taskClaimingOpts.strategy).toBe('update_by_query');

    mockTaskTypeRunFn.mockImplementation(() => {
      return { state: {} };
    });

    // inject a task to run and ensure it is claimed and run
    const id1 = uuidV4();
    await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
      id: id1,
      taskType: 'fooType',
      params: { foo: true },
      state: { foo: 'test', bar: 'test', baz: 'test' },
      stateVersion: 4,
      runAt: new Date(),
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });

    await retry(async () => {
      expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(1);
    });

    if (kibanaServer) {
      await kibanaServer.stop();
    }

    const setupResultMget = await setupKibanaServer({
      xpack: {
        task_manager: {
          claim_strategy: 'mget',
        },
      },
    });
    kibanaServer = setupResultMget.kibanaServer;

    taskClaimingOpts = TaskClaimingMock.mock.calls[1][0];
    expect(taskClaimingOpts.strategy).toBe('mget');

    // inject a task to run and ensure it is claimed and run
    const id2 = uuidV4();
    await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
      id: id2,
      taskType: 'fooType',
      params: { foo: true },
      state: { foo: 'test', bar: 'test', baz: 'test' },
      stateVersion: 4,
      runAt: new Date(),
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });

    await retry(async () => {
      expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(2);
    });

    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it('should switch from mget to default and still claim tasks', async () => {
    const setupResultMget = await setupTestServers({
      xpack: {
        task_manager: {
          claim_strategy: 'mget',
        },
      },
    });
    const esServer = setupResultMget.esServer;
    let kibanaServer = setupResultMget.kibanaServer;
    let taskClaimingOpts: TaskClaimingOpts = TaskClaimingMock.mock.calls[0][0];

    expect(taskClaimingOpts.strategy).toBe('mget');

    mockTaskTypeRunFn.mockImplementation(() => {
      return { state: {} };
    });

    // inject a task to run and ensure it is claimed and run
    const id1 = uuidV4();
    await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
      id: id1,
      taskType: 'fooType',
      params: { foo: true },
      state: { foo: 'test', bar: 'test', baz: 'test' },
      stateVersion: 4,
      runAt: new Date(),
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });

    await retry(async () => {
      expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(1);
    });

    if (kibanaServer) {
      await kibanaServer.stop();
    }

    const setupResultDefault = await setupKibanaServer();
    kibanaServer = setupResultDefault.kibanaServer;

    taskClaimingOpts = TaskClaimingMock.mock.calls[1][0];
    expect(taskClaimingOpts.strategy).toBe('update_by_query');

    // inject a task to run and ensure it is claimed and run
    const id2 = uuidV4();
    await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
      id: id2,
      taskType: 'fooType',
      params: { foo: true },
      state: { foo: 'test', bar: 'test', baz: 'test' },
      stateVersion: 4,
      runAt: new Date(),
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });

    await retry(async () => {
      expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(2);
    });

    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it('should switch from default to mget and claim tasks that were running during shutdown', async () => {
    const setupResultDefault = await setupTestServers();
    const esServer = setupResultDefault.esServer;
    let kibanaServer = setupResultDefault.kibanaServer;
    let taskClaimingOpts: TaskClaimingOpts = TaskClaimingMock.mock.calls[0][0];

    expect(taskClaimingOpts.strategy).toBe('update_by_query');

    mockTaskTypeRunFn.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { state: {} };
    });

    // inject a task to run and ensure it is claimed and run
    const id1 = uuidV4();
    await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
      id: id1,
      taskType: 'fooType',
      params: { foo: true },
      state: { foo: 'test', bar: 'test', baz: 'test' },
      stateVersion: 4,
      runAt: new Date(),
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      timeoutOverride: '5s',
      retryAt: null,
      ownerId: null,
    });

    await retry(async () => {
      expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(1);
    });

    if (kibanaServer) {
      await kibanaServer.stop();
    }

    const setupResultMget = await setupKibanaServer({
      xpack: {
        task_manager: {
          claim_strategy: 'mget',
        },
      },
    });
    kibanaServer = setupResultMget.kibanaServer;

    taskClaimingOpts = TaskClaimingMock.mock.calls[1][0];
    expect(taskClaimingOpts.strategy).toBe('mget');

    // task doc should still exist and be running
    const task = await kibanaServer.coreStart.elasticsearch.client.asInternalUser.get<{
      task: SerializedConcreteTaskInstance;
    }>({
      id: `task:${id1}`,
      index: '.kibana_task_manager',
    });

    expect(task._source?.task?.status).toBe(TaskStatus.Running);

    // task manager should pick up and claim the task that was running during shutdown
    await retry(
      async () => {
        expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(2);
      },
      { times: 60, intervalMs: 1000 }
    );

    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it('should switch from mget to default and claim tasks that were running during shutdown', async () => {
    const setupResultMget = await setupTestServers({
      xpack: {
        task_manager: {
          claim_strategy: 'mget',
        },
      },
    });
    const esServer = setupResultMget.esServer;
    let kibanaServer = setupResultMget.kibanaServer;
    let taskClaimingOpts: TaskClaimingOpts = TaskClaimingMock.mock.calls[0][0];

    expect(taskClaimingOpts.strategy).toBe('mget');

    mockTaskTypeRunFn.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { state: {} };
    });

    // inject a task to run and ensure it is claimed and run
    const id1 = uuidV4();
    await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
      id: id1,
      taskType: 'fooType',
      params: { foo: true },
      state: { foo: 'test', bar: 'test', baz: 'test' },
      stateVersion: 4,
      runAt: new Date(),
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      timeoutOverride: '5s',
      retryAt: null,
      ownerId: null,
    });

    await retry(async () => {
      expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(1);
    });

    if (kibanaServer) {
      await kibanaServer.stop();
    }

    const setupResultDefault = await setupKibanaServer();
    kibanaServer = setupResultDefault.kibanaServer;

    taskClaimingOpts = TaskClaimingMock.mock.calls[1][0];
    expect(taskClaimingOpts.strategy).toBe('update_by_query');

    // task doc should still exist and be running
    const task = await kibanaServer.coreStart.elasticsearch.client.asInternalUser.get<{
      task: SerializedConcreteTaskInstance;
    }>({
      id: `task:${id1}`,
      index: '.kibana_task_manager',
    });

    expect(task._source?.task?.status).toBe(TaskStatus.Running);

    await retry(
      async () => {
        expect(mockTaskTypeRunFn).toHaveBeenCalledTimes(2);
      },
      { times: 60, intervalMs: 1000 }
    );

    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });
});
