/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { TaskStatus } from '../task';
import type { TaskPollingLifecycleOpts } from '../polling_lifecycle';
import type { TaskClaimingOpts } from '../queries/task_claiming';
import type { TaskManagerStartContract } from '../plugin';
import { TaskManagerPlugin } from '../plugin';
import { injectTask, setupTestServers, retry } from './lib';
import { createSkipError } from '../task_running/errors';

const mockTaskTypeRunFn = jest.fn();
const mockCreateTaskRunner = jest.fn();
const mockTaskType = {
  title: '',
  description: '',
  createTaskRunner: mockCreateTaskRunner.mockImplementation(() => ({
    run: mockTaskTypeRunFn,
  })),
};

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

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');

describe.skip('Skip running tasks with invalid params', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManagerPlugin: TaskManagerStartContract;
  let pollingLifecycleOpts: TaskPollingLifecycleOpts;

  beforeAll(async () => {
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    expect(taskManagerStartSpy).toHaveBeenCalledTimes(1);
    taskManagerPlugin = taskManagerStartSpy.mock.results[0].value;

    expect(TaskPollingLifecycleMock).toHaveBeenCalledTimes(1);
    pollingLifecycleOpts = TaskPollingLifecycleMock.mock.calls[0][0];
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
    await taskManagerPlugin.removeIfExists('foo');
  });

  it('skips', async () => {
    const state = { foo: 'bar' };
    const params = { foo: 'baz' };
    const warnLogSpy = jest.spyOn(pollingLifecycleOpts.logger, 'warn');

    const taskRunnerPromise = new Promise((resolve) => {
      mockTaskTypeRunFn.mockImplementation(() => {
        setTimeout(resolve, 0);
        return { state: {}, error: createSkipError(new Error('test error')) };
      });
    });

    await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
      id: 'foo',
      taskType: 'fooType',
      params,
      state,
      runAt: new Date(),
      enabled: true,
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });

    await taskRunnerPromise;

    await retry(async () => {
      expect(mockCreateTaskRunner).toHaveBeenCalledTimes(3);
    });

    expect(warnLogSpy).toHaveBeenNthCalledWith(
      1,
      'Task Manager has skipped executing the Task (fooType/foo) 1 times as it has invalid params.'
    );
    expect(warnLogSpy).toHaveBeenNthCalledWith(
      2,
      'Task Manager has skipped executing the Task (fooType/foo) 2 times as it has invalid params.'
    );
    expect(warnLogSpy).toHaveBeenNthCalledWith(
      3,
      'Task Manager has skipped executing the Task (fooType/foo) 3 times as it has invalid params.'
    );

    const firstTaskRunnerCall = mockCreateTaskRunner.mock.calls[0][0];
    const secondTaskRunnerCall = mockCreateTaskRunner.mock.calls[1][0];
    const thirdTaskRunnerCall = mockCreateTaskRunner.mock.calls[2][0];

    expect(firstTaskRunnerCall.taskInstance.requeueInvalidTask).toBe(undefined);
    expect(firstTaskRunnerCall.taskInstance).toEqual(
      expect.objectContaining({ attempts: 1, state, params })
    );

    expect(secondTaskRunnerCall.taskInstance).toEqual(
      expect.objectContaining({ attempts: 1, requeueInvalidTask: { attempts: 1 }, state, params })
    );
    expect(thirdTaskRunnerCall.taskInstance).toEqual(
      expect.objectContaining({ attempts: 1, requeueInvalidTask: { attempts: 2 }, state, params })
    );
  });
});
