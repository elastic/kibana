/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { schema } from '@kbn/config-schema';
import { TaskStatus } from '../task';
import { type TaskPollingLifecycleOpts } from '../polling_lifecycle';
import { type TaskClaimingOpts } from '../queries/task_claiming';
import { TaskManagerPlugin, type TaskManagerStartContract } from '../plugin';
import { injectTask, setupTestServers, retry } from './lib';

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

const mockTaskTypeRunFn = jest.fn();
const mockCreateTaskRunner = jest.fn();
const mockTaskType = {
  title: '',
  description: '',
  stateSchemaByVersion: {
    1: {
      up: (state: Record<string, unknown>) => ({ foo: state.foo || '' }),
      schema: schema.object({
        foo: schema.string(),
      }),
    },
    2: {
      up: (state: Record<string, unknown>) => ({ ...state, bar: state.bar || '' }),
      schema: schema.object({
        foo: schema.string(),
        bar: schema.string(),
      }),
    },
    3: {
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

describe('task state validation', () => {
  // FLAKY: https://github.com/elastic/kibana/issues/161081
  describe.skip('allow_reading_invalid_state: true', () => {
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

    it('should drop unknown fields from the task state', async () => {
      const taskRunnerPromise = new Promise((resolve) => {
        mockTaskTypeRunFn.mockImplementation(() => {
          setTimeout(resolve, 0);
          return { state: {} };
        });
      });

      await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
        id: 'foo',
        taskType: 'fooType',
        params: { foo: true },
        state: { foo: 'test', bar: 'test', baz: 'test', invalidProperty: 'invalid' },
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

      await taskRunnerPromise;

      expect(mockCreateTaskRunner).toHaveBeenCalledTimes(1);
      const call = mockCreateTaskRunner.mock.calls[0][0];
      expect(call.taskInstance.state).toEqual({
        foo: 'test',
        bar: 'test',
        baz: 'test',
      });
    });

    it('should fail to update the task if the task runner returns an unknown property in the state', async () => {
      const errorLogSpy = jest.spyOn(pollingLifecycleOpts.logger, 'error');
      const taskRunnerPromise = new Promise((resolve) => {
        mockTaskTypeRunFn.mockImplementation(() => {
          setTimeout(resolve, 0);
          return { state: { invalidField: true, foo: 'test', bar: 'test', baz: 'test' } };
        });
      });

      await taskManagerPlugin.schedule({
        id: 'foo',
        taskType: 'fooType',
        params: {},
        state: { foo: 'test', bar: 'test', baz: 'test' },
        schedule: { interval: '1d' },
      });

      await taskRunnerPromise;

      expect(mockCreateTaskRunner).toHaveBeenCalledTimes(1);
      const call = mockCreateTaskRunner.mock.calls[0][0];
      expect(call.taskInstance.state).toEqual({
        foo: 'test',
        bar: 'test',
        baz: 'test',
      });
      expect(errorLogSpy).toHaveBeenCalledWith(
        'Task fooType "foo" failed: Error: [invalidField]: definition for this key is missing',
        expect.anything()
      );
    });

    it('should migrate the task state', async () => {
      const taskRunnerPromise = new Promise((resolve) => {
        mockTaskTypeRunFn.mockImplementation(() => {
          setTimeout(resolve, 0);
          return { state: {} };
        });
      });

      await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
        id: 'foo',
        taskType: 'fooType',
        params: { foo: true },
        state: {},
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

      expect(mockCreateTaskRunner).toHaveBeenCalledTimes(1);
      const call = mockCreateTaskRunner.mock.calls[0][0];
      expect(call.taskInstance.state).toEqual({
        foo: '',
        bar: '',
        baz: '',
      });
    });

    it('should debug log by default when reading an invalid task state', async () => {
      const debugLogSpy = jest.spyOn(pollingLifecycleOpts.logger, 'debug');
      const taskRunnerPromise = new Promise((resolve) => {
        mockTaskTypeRunFn.mockImplementation(() => {
          setTimeout(resolve, 0);
          return { state: {} };
        });
      });

      await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
        id: 'foo',
        taskType: 'fooType',
        params: { foo: true },
        state: { foo: true, bar: 'test', baz: 'test' },
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

      await taskRunnerPromise;

      expect(mockCreateTaskRunner).toHaveBeenCalledTimes(1);
      const call = mockCreateTaskRunner.mock.calls[0][0];
      expect(call.taskInstance.state).toEqual({
        foo: true,
        bar: 'test',
        baz: 'test',
      });

      expect(debugLogSpy).toHaveBeenCalledWith(
        `[fooType][foo] Failed to validate the task's state. Allowing read operation to proceed because allow_reading_invalid_state is true. Error: [foo]: expected value of type [string] but got [boolean]`
      );
    });
  });

  describe('allow_reading_invalid_state: false', () => {
    let esServer: TestElasticsearchUtils;
    let kibanaServer: TestKibanaUtils;
    let taskManagerPlugin: TaskManagerStartContract;
    let pollingLifecycleOpts: TaskPollingLifecycleOpts;

    beforeAll(async () => {
      const setupResult = await setupTestServers({
        xpack: {
          task_manager: {
            allow_reading_invalid_state: false,
          },
        },
      });
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

    it('should fail the task run when setting allow_reading_invalid_state:false and reading an invalid state', async () => {
      const errorLogSpy = jest.spyOn(pollingLifecycleOpts.logger, 'error');

      await injectTask(kibanaServer.coreStart.elasticsearch.client.asInternalUser, {
        id: 'foo',
        taskType: 'fooType',
        params: { foo: true },
        state: { foo: true, bar: 'test', baz: 'test' },
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
        expect(errorLogSpy).toHaveBeenCalledWith(
          `Failed to poll for work: Error: [foo]: expected value of type [string] but got [boolean]`
        );
      });

      expect(mockCreateTaskRunner).not.toHaveBeenCalled();
    });
  });
});
