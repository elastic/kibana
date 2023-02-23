/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { secondsFromNow } from '../lib/intervals';
import { asOk, asErr } from '../lib/result_type';
import { TaskManagerRunner, TaskRunningStage, TaskRunResult } from '.';
import {
  TaskEvent,
  asTaskRunEvent,
  asTaskMarkRunningEvent,
  TaskRun,
  TaskPersistence,
} from '../task_events';
import { ConcreteTaskInstance, TaskStatus } from '../task';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import moment from 'moment';
import { TaskDefinitionRegistry, TaskTypeDictionary } from '../task_type_dictionary';
import { mockLogger } from '../test_utils';
import { throwUnrecoverableError } from './errors';
import { taskStoreMock } from '../task_store.mock';
import apm from 'elastic-apm-node';
import { executionContextServiceMock } from '@kbn/core/server/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import {
  calculateDelay,
  TASK_MANAGER_RUN_TRANSACTION_TYPE,
  TASK_MANAGER_TRANSACTION_TYPE,
  TASK_MANAGER_TRANSACTION_TYPE_MARK_AS_RUNNING,
} from './task_runner';

const executionContext = executionContextServiceMock.createSetupContract();
const minutesFromNow = (mins: number): Date => secondsFromNow(mins * 60);

let fakeTimer: sinon.SinonFakeTimers;

jest.mock('uuid', () => ({
  v4: () => 'NEW_UUID',
}));

beforeAll(() => {
  fakeTimer = sinon.useFakeTimers();
});

afterAll(() => fakeTimer.restore());

describe('TaskManagerRunner', () => {
  const pendingStageSetup = (opts: TestOpts) => testOpts(TaskRunningStage.PENDING, opts);
  const readyToRunStageSetup = (opts: TestOpts) => testOpts(TaskRunningStage.READY_TO_RUN, opts);
  const mockApmTrans = {
    end: jest.fn(),
    addLabels: jest.fn(),
    setLabel: jest.fn(),
  };

  test('execution ID', async () => {
    const { runner } = await pendingStageSetup({
      instance: {
        id: 'foo',
        taskType: 'bar',
      },
    });

    expect(runner.taskExecutionId).toEqual(`foo::NEW_UUID`);
    expect(runner.isSameTask(`foo::ANOTHER_UUID`)).toEqual(true);
    expect(runner.isSameTask(`bar::ANOTHER_UUID`)).toEqual(false);
  });

  describe('Pending Stage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest
        .spyOn(apm, 'startTransaction')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(() => mockApmTrans as any);
    });
    test('makes calls to APM as expected when task markedAsRunning is success', async () => {
      const { runner } = await pendingStageSetup({
        instance: {
          schedule: {
            interval: '10m',
          },
        },
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });
      await runner.markTaskAsRunning();
      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_TRANSACTION_TYPE_MARK_AS_RUNNING,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');
    });
    test('makes calls to APM as expected when task markedAsRunning fails', async () => {
      const { runner, store } = await pendingStageSetup({
        instance: {
          schedule: {
            interval: '10m',
          },
        },
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });
      store.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('type', 'id')
      );
      await expect(runner.markTaskAsRunning()).rejects.toMatchInlineSnapshot(
        `[Error: Saved object [type/id] not found]`
      );
      // await runner.markTaskAsRunning();
      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_TRANSACTION_TYPE_MARK_AS_RUNNING,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('failure');
    });
    test('provides execution context on run', async () => {
      const { runner } = await readyToRunStageSetup({
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                return { state: {} };
              },
            }),
          },
        },
      });
      await runner.run();
      expect(executionContext.withContext).toHaveBeenCalledTimes(1);
      expect(executionContext.withContext).toHaveBeenCalledWith(
        {
          description: 'run task',
          id: 'foo',
          name: 'run bar',
          type: 'task manager',
        },
        expect.any(Function)
      );
    });
    test('provides details about the task that is running', async () => {
      const { runner } = await pendingStageSetup({
        instance: {
          id: 'foo',
          taskType: 'bar',
        },
      });

      expect(runner.id).toEqual('foo');
      expect(runner.taskType).toEqual('bar');
      expect(runner.toString()).toEqual('bar "foo"');
    });

    test('calculates retryAt by schedule when running a recurring task', async () => {
      const intervalMinutes = 10;
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(0, 2);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: {
            interval: `${intervalMinutes}m`,
          },
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      await runner.markTaskAsRunning();

      expect(store.update).toHaveBeenCalledTimes(1);
      const instance = store.update.mock.calls[0][0];

      expect(instance.retryAt!.getTime()).toEqual(
        instance.startedAt!.getTime() + intervalMinutes * 60 * 1000
      );
      expect(instance.enabled).not.toBeDefined();
    });

    test('calculates retryAt by default timout when it exceeds the schedule of a recurring task', async () => {
      const intervalSeconds = 20;
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(0, 2);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: {
            interval: `${intervalSeconds}s`,
          },
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      await runner.markTaskAsRunning();

      expect(store.update).toHaveBeenCalledTimes(1);
      const instance = store.update.mock.calls[0][0];

      expect(instance.retryAt!.getTime()).toEqual(instance.startedAt!.getTime() + 5 * 60 * 1000);
      expect(instance.enabled).not.toBeDefined();
    });

    test('calculates retryAt by timeout if it exceeds the schedule when running a recurring task', async () => {
      const timeoutMinutes = 1;
      const intervalSeconds = 20;
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(0, 2);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: {
            interval: `${intervalSeconds}s`,
          },
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `${timeoutMinutes}m`,
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      await runner.markTaskAsRunning();

      expect(store.update).toHaveBeenCalledTimes(1);
      const instance = store.update.mock.calls[0][0];

      expect(instance.retryAt!.getTime()).toEqual(
        instance.startedAt!.getTime() + timeoutMinutes * 60 * 1000
      );
      expect(instance.enabled).not.toBeDefined();
    });

    test('sets startedAt, status, attempts and retryAt when claiming a task', async () => {
      const timeoutMinutes = 1;
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(0, 2);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          enabled: true,
          attempts: initialAttempts,
          schedule: undefined,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `${timeoutMinutes}m`,
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      await runner.markTaskAsRunning();

      expect(store.update).toHaveBeenCalledTimes(1);
      const instance = store.update.mock.calls[0][0];

      expect(instance.attempts).toEqual(initialAttempts + 1);
      expect(instance.status).toBe('running');
      expect(instance.startedAt!.getTime()).toEqual(Date.now());
      const expectedRunAt = Date.now() + calculateDelay(initialAttempts + 1);
      expect(instance.retryAt!.getTime()).toEqual(expectedRunAt + timeoutMinutes * 60 * 1000);
      expect(instance.enabled).not.toBeDefined();
    });

    test('uses getRetry (returning date) to set retryAt when defined', async () => {
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(1, 3);
      const nextRetry = new Date(Date.now() + _.random(15, 100) * 1000);
      const timeoutMinutes = 1;
      const getRetryStub = sinon.stub().returns(nextRetry);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: undefined,
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `${timeoutMinutes}m`,
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      await runner.markTaskAsRunning();

      expect(store.update).toHaveBeenCalledTimes(1);
      sinon.assert.calledWith(getRetryStub, initialAttempts + 1);
      const instance = store.update.mock.calls[0][0];

      expect(instance.retryAt!.getTime()).toEqual(
        new Date(nextRetry.getTime() + timeoutMinutes * 60 * 1000).getTime()
      );
      expect(instance.enabled).not.toBeDefined();
    });

    test('it returns false when markTaskAsRunning fails due to VERSION_CONFLICT_STATUS', async () => {
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(1, 3);
      const nextRetry = new Date(Date.now() + _.random(15, 100) * 1000);
      const timeoutMinutes = 1;
      const getRetryStub = sinon.stub().returns(nextRetry);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: undefined,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `${timeoutMinutes}m`,
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      store.update.mockRejectedValue(
        SavedObjectsErrorHelpers.decorateConflictError(new Error('repo error'))
      );

      expect(await runner.markTaskAsRunning()).toEqual(false);
    });

    test('it throw when markTaskAsRunning fails for unexpected reasons', async () => {
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(1, 3);
      const nextRetry = new Date(Date.now() + _.random(15, 100) * 1000);
      const timeoutMinutes = 1;
      const getRetryStub = sinon.stub().returns(nextRetry);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: undefined,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `${timeoutMinutes}m`,
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      store.update.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError('type', 'id')
      );

      return expect(runner.markTaskAsRunning()).rejects.toMatchInlineSnapshot(
        `[Error: Saved object [type/id] not found]`
      );
    });

    test(`it tries to increment a task's attempts when markTaskAsRunning fails for unexpected reasons`, async () => {
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(1, 3);
      const nextRetry = new Date(Date.now() + _.random(15, 100) * 1000);
      const timeoutMinutes = 1;
      const getRetryStub = sinon.stub().returns(nextRetry);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: undefined,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `${timeoutMinutes}m`,
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      store.update.mockRejectedValueOnce(SavedObjectsErrorHelpers.createBadRequestError('type'));
      store.update.mockResolvedValueOnce(
        mockInstance({
          id,
          attempts: initialAttempts,
          schedule: undefined,
        })
      );

      await expect(runner.markTaskAsRunning()).rejects.toMatchInlineSnapshot(
        `[Error: type: Bad Request]`
      );

      expect(store.update).toHaveBeenCalledWith({
        ...mockInstance({
          id,
          attempts: initialAttempts + 1,
          schedule: undefined,
        }),
        status: TaskStatus.Idle,
        startedAt: null,
        retryAt: null,
        ownerId: null,
      });
    });

    test(`it doesnt try to increment a task's attempts when markTaskAsRunning fails for version conflict`, async () => {
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(1, 3);
      const nextRetry = new Date(Date.now() + _.random(15, 100) * 1000);
      const timeoutMinutes = 1;
      const getRetryStub = sinon.stub().returns(nextRetry);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: undefined,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `${timeoutMinutes}m`,
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      store.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError('type', 'id')
      );
      store.update.mockResolvedValueOnce(
        mockInstance({
          id,
          attempts: initialAttempts,
          schedule: undefined,
        })
      );

      await expect(runner.markTaskAsRunning()).resolves.toMatchInlineSnapshot(`false`);

      expect(store.update).toHaveBeenCalledTimes(1);
    });

    test(`it doesnt try to increment a task's attempts when markTaskAsRunning fails due to Saved Object not being found`, async () => {
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(1, 3);
      const nextRetry = new Date(Date.now() + _.random(15, 100) * 1000);
      const timeoutMinutes = 1;
      const getRetryStub = sinon.stub().returns(nextRetry);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: undefined,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `${timeoutMinutes}m`,
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      store.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('type', 'id')
      );
      store.update.mockResolvedValueOnce(
        mockInstance({
          id,
          attempts: initialAttempts,
          schedule: undefined,
        })
      );

      await expect(runner.markTaskAsRunning()).rejects.toMatchInlineSnapshot(
        `[Error: Saved object [type/id] not found]`
      );

      expect(store.update).toHaveBeenCalledTimes(1);
    });

    test('uses getRetry (returning true) to set retryAt when defined', async () => {
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(1, 3);
      const timeoutMinutes = 1;
      const getRetryStub = sinon.stub().returns(true);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: undefined,
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `${timeoutMinutes}m`,
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      await runner.markTaskAsRunning();

      expect(store.update).toHaveBeenCalledTimes(1);
      sinon.assert.calledWith(getRetryStub, initialAttempts + 1);
      const instance = store.update.mock.calls[0][0];

      const attemptDelay = calculateDelay(initialAttempts + 1);
      const timeoutDelay = timeoutMinutes * 60 * 1000;
      expect(instance.retryAt!.getTime()).toEqual(
        new Date(Date.now() + attemptDelay + timeoutDelay).getTime()
      );
      expect(instance.enabled).not.toBeDefined();
    });

    test('uses getRetry (returning false) to set retryAt when defined', async () => {
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(1, 3);
      const timeoutMinutes = 1;
      const getRetryStub = sinon.stub().returns(false);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: undefined,
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `${timeoutMinutes}m`,
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      await runner.markTaskAsRunning();

      expect(store.update).toHaveBeenCalledTimes(1);
      sinon.assert.calledWith(getRetryStub, initialAttempts + 1);
      const instance = store.update.mock.calls[0][0];

      expect(instance.retryAt!).toBeNull();
      expect(instance.status).toBe('running');
      expect(instance.enabled).not.toBeDefined();
    });

    test('bypasses getRetry (returning false) of a recurring task to set retryAt when defined', async () => {
      const id = _.random(1, 20).toString();
      const initialAttempts = _.random(1, 3);
      const timeoutMinutes = 1;
      const getRetryStub = sinon.stub().returns(false);
      const { runner, store } = await pendingStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: { interval: '1m' },
          startedAt: new Date(),
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `${timeoutMinutes}m`,
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      await runner.markTaskAsRunning();

      expect(store.update).toHaveBeenCalledTimes(1);
      sinon.assert.notCalled(getRetryStub);
      const instance = store.update.mock.calls[0][0];

      const timeoutDelay = timeoutMinutes * 60 * 1000;
      expect(instance.retryAt!.getTime()).toEqual(new Date(Date.now() + timeoutDelay).getTime());
      expect(instance.enabled).not.toBeDefined();
    });

    describe('TaskEvents', () => {
      test('emits TaskEvent when a task is marked as running', async () => {
        const id = _.random(1, 20).toString();
        const onTaskEvent = jest.fn();
        const { runner, instance, store } = await pendingStageSetup({
          onTaskEvent,
          instance: {
            id,
          },
          definitions: {
            bar: {
              title: 'Bar!',
              timeout: `1m`,
              createTaskRunner: () => ({
                run: async () => undefined,
              }),
            },
          },
        });

        store.update.mockResolvedValueOnce(instance);

        await runner.markTaskAsRunning();

        expect(onTaskEvent).toHaveBeenCalledWith(asTaskMarkRunningEvent(id, asOk(instance)));
      });

      test('emits TaskEvent when a task fails to be marked as running', async () => {
        expect.assertions(2);

        const id = _.random(1, 20).toString();
        const onTaskEvent = jest.fn();
        const { runner, store } = await pendingStageSetup({
          onTaskEvent,
          instance: {
            id,
          },
          definitions: {
            bar: {
              title: 'Bar!',
              timeout: `1m`,
              createTaskRunner: () => ({
                run: async () => undefined,
              }),
            },
          },
        });

        store.update.mockRejectedValueOnce(new Error('cant mark as running'));

        try {
          await runner.markTaskAsRunning();
        } catch (err) {
          expect(onTaskEvent).toHaveBeenCalledWith(asTaskMarkRunningEvent(id, asErr(err)));
        }
        expect(onTaskEvent).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Ready To Run Stage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    test('makes calls to APM as expected when task runs successfully', async () => {
      const { runner } = await readyToRunStageSetup({
        instance: {
          params: { a: 'b' },
          state: { hey: 'there' },
        },
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                return { state: {} };
              },
            }),
          },
        },
      });
      await runner.run();
      expect(apm.startTransaction).toHaveBeenCalledWith('bar', TASK_MANAGER_RUN_TRANSACTION_TYPE, {
        childOf: 'apmTraceparent',
      });
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');
    });
    test('makes calls to APM and logs errors as expected when task fails', async () => {
      const { runner, logger } = await readyToRunStageSetup({
        instance: {
          params: { a: 'b' },
          state: { hey: 'there' },
        },
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                throw new Error('rar');
              },
            }),
          },
        },
      });
      await runner.run();
      expect(apm.startTransaction).toHaveBeenCalledWith('bar', TASK_MANAGER_RUN_TRANSACTION_TYPE, {
        childOf: 'apmTraceparent',
      });
      expect(mockApmTrans.end).toHaveBeenCalledWith('failure');
      const loggerCall = logger.error.mock.calls[0][0];
      const loggerMeta = logger.error.mock.calls[0][1];
      expect(loggerCall as string).toMatchInlineSnapshot(`"Task bar \\"foo\\" failed: Error: rar"`);
      expect(loggerMeta?.tags).toEqual(['bar', 'foo', 'task-run-failed']);
      expect(loggerMeta?.error?.stack_trace).toBeDefined();
    });
    test('provides execution context on run', async () => {
      const { runner } = await readyToRunStageSetup({
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                return { state: {} };
              },
            }),
          },
        },
      });
      await runner.run();
      expect(executionContext.withContext).toHaveBeenCalledTimes(1);
      expect(executionContext.withContext).toHaveBeenCalledWith(
        {
          description: 'run task',
          id: 'foo',
          name: 'run bar',
          type: 'task manager',
        },
        expect.any(Function)
      );
    });
    test('queues a reattempt if the task fails', async () => {
      const initialAttempts = _.random(0, 2);
      const id = Date.now().toString();
      const { runner, store } = await readyToRunStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          params: { a: 'b' },
          state: { hey: 'there' },
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                throw new Error('Dangit!');
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.update).toHaveBeenCalledTimes(1);
      const instance = store.update.mock.calls[0][0];

      expect(instance.id).toEqual(id);
      const expectedRunAt = new Date(Date.now() + calculateDelay(initialAttempts));
      expect(instance.runAt.getTime()).toEqual(expectedRunAt.getTime());
      expect(instance.params).toEqual({ a: 'b' });
      expect(instance.state).toEqual({ hey: 'there' });
      expect(instance.enabled).not.toBeDefined();
    });

    test('reschedules tasks that have an schedule', async () => {
      const { runner, store } = await readyToRunStageSetup({
        instance: {
          schedule: { interval: '10m' },
          status: TaskStatus.Running,
          startedAt: new Date(),
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                return { state: {} };
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.update).toHaveBeenCalledTimes(1);
      const instance = store.update.mock.calls[0][0];

      expect(instance.runAt.getTime()).toBeGreaterThan(minutesFromNow(9).getTime());
      expect(instance.runAt.getTime()).toBeLessThanOrEqual(minutesFromNow(10).getTime());
      expect(instance.enabled).not.toBeDefined();
    });

    test('expiration returns time after which timeout will have elapsed from start', async () => {
      const now = moment();
      const { runner } = await readyToRunStageSetup({
        instance: {
          schedule: { interval: '10m' },
          status: TaskStatus.Running,
          startedAt: now.toDate(),
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `1m`,
            createTaskRunner: () => ({
              async run() {
                return { state: {} };
              },
            }),
          },
        },
      });

      await runner.run();

      expect(runner.isExpired).toBe(false);
      expect(runner.expiration).toEqual(now.add(1, 'm').toDate());
    });

    test('runDuration returns duration which has elapsed since start', async () => {
      const now = moment().subtract(30, 's').toDate();
      const { runner } = await readyToRunStageSetup({
        instance: {
          schedule: { interval: '10m' },
          status: TaskStatus.Running,
          startedAt: now,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: `1m`,
            createTaskRunner: () => ({
              async run() {
                return { state: {} };
              },
            }),
          },
        },
      });

      await runner.run();

      expect(runner.isExpired).toBe(false);
      expect(runner.startedAt).toEqual(now);
    });

    test('reschedules tasks that return a runAt', async () => {
      const runAt = minutesFromNow(_.random(1, 10));
      const { runner, store } = await readyToRunStageSetup({
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                return { runAt, state: {} };
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.update).toHaveBeenCalledTimes(1);
      expect(store.update).toHaveBeenCalledWith(expect.objectContaining({ runAt }));
    });

    test('reschedules tasks that return a schedule', async () => {
      const runAt = minutesFromNow(1);
      const schedule = {
        interval: '1m',
      };
      const { runner, store } = await readyToRunStageSetup({
        instance: {
          status: TaskStatus.Running,
          startedAt: new Date(),
        },
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                return { schedule, state: {} };
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.update).toHaveBeenCalledTimes(1);
      expect(store.update).toHaveBeenCalledWith(expect.objectContaining({ runAt }));
    });

    test(`doesn't reschedule recurring tasks that throw an unrecoverable error`, async () => {
      const id = _.random(1, 20).toString();
      const error = new Error('Dangit!');
      const onTaskEvent = jest.fn();
      const {
        runner,
        store,
        instance: originalInstance,
      } = await readyToRunStageSetup({
        onTaskEvent,
        instance: {
          id,
          schedule: { interval: '20m' },
          status: TaskStatus.Running,
          startedAt: new Date(),
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                throwUnrecoverableError(error);
              },
            }),
          },
        },
      });

      await runner.run();

      const instance = store.update.mock.calls[0][0];
      expect(instance.status).toBe('failed');
      expect(instance.enabled).not.toBeDefined();

      expect(onTaskEvent).toHaveBeenCalledWith(
        withAnyTiming(
          asTaskRunEvent(
            id,
            asErr({
              error,
              persistence: TaskPersistence.Recurring,
              task: originalInstance,
              result: TaskRunResult.Failed,
            })
          )
        )
      );
      expect(onTaskEvent).toHaveBeenCalledTimes(1);
    });

    test('tasks that return runAt override the schedule', async () => {
      const runAt = minutesFromNow(_.random(5));
      const { runner, store } = await readyToRunStageSetup({
        instance: {
          schedule: { interval: '20m' },
        },
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                return { runAt, state: {} };
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.update).toHaveBeenCalledTimes(1);
      expect(store.update).toHaveBeenCalledWith(expect.objectContaining({ runAt }));
    });

    test('removes non-recurring tasks after they complete', async () => {
      const id = _.random(1, 20).toString();
      const { runner, store } = await readyToRunStageSetup({
        instance: {
          id,
          schedule: undefined,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                return undefined;
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.remove).toHaveBeenCalledTimes(1);
      expect(store.remove).toHaveBeenCalledWith(id);
    });

    test('cancel cancels the task runner, if it is cancellable', async () => {
      let wasCancelled = false;
      const { runner, logger } = await readyToRunStageSetup({
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                const promise = new Promise((r) => setTimeout(r, 1000));
                fakeTimer.tick(1000);
                await promise;
              },
              async cancel() {
                wasCancelled = true;
              },
            }),
          },
        },
      });

      const promise = runner.run();
      await Promise.resolve();
      await runner.cancel();
      await promise;

      expect(wasCancelled).toBeTruthy();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('debug logs if cancel is called on a non-cancellable task', async () => {
      const { runner, logger } = await readyToRunStageSetup({
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              run: async () => undefined,
            }),
          },
        },
      });

      const promise = runner.run();
      await runner.cancel();
      await promise;

      expect(logger.debug).toHaveBeenCalledWith(`The task bar "foo" is not cancellable.`);
    });

    test('uses getRetry function (returning date) on error when defined', async () => {
      const initialAttempts = _.random(1, 3);
      const nextRetry = new Date(Date.now() + _.random(15, 100) * 1000);
      const id = Date.now().toString();
      const getRetryStub = sinon.stub().returns(nextRetry);
      const error = new Error('Dangit!');
      const { runner, store } = await readyToRunStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              async run() {
                throw error;
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.update).toHaveBeenCalledTimes(1);
      sinon.assert.calledWith(getRetryStub, initialAttempts, error);
      const instance = store.update.mock.calls[0][0];

      expect(instance.runAt.getTime()).toEqual(nextRetry.getTime());
      expect(instance.enabled).not.toBeDefined();
    });

    test('uses getRetry function (returning true) on error when defined', async () => {
      const initialAttempts = _.random(1, 3);
      const id = Date.now().toString();
      const getRetryStub = sinon.stub().returns(true);
      const error = new Error('Dangit!');
      const { runner, store } = await readyToRunStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              async run() {
                throw error;
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.update).toHaveBeenCalledTimes(1);
      sinon.assert.calledWith(getRetryStub, initialAttempts, error);
      const instance = store.update.mock.calls[0][0];

      const expectedRunAt = new Date(Date.now() + calculateDelay(initialAttempts));
      expect(instance.runAt.getTime()).toEqual(expectedRunAt.getTime());
      expect(instance.enabled).not.toBeDefined();
    });

    test('uses getRetry function (returning false) on error when defined', async () => {
      const initialAttempts = _.random(1, 3);
      const id = Date.now().toString();
      const getRetryStub = sinon.stub().returns(false);
      const error = new Error('Dangit!');
      const { runner, store } = await readyToRunStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              async run() {
                throw error;
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.update).toHaveBeenCalledTimes(1);
      sinon.assert.calledWith(getRetryStub, initialAttempts, error);
      const instance = store.update.mock.calls[0][0];

      expect(instance.status).toBe('failed');
      expect(instance.enabled).not.toBeDefined();
    });

    test('bypasses getRetry function (returning false) on error of a recurring task', async () => {
      const initialAttempts = _.random(1, 3);
      const id = Date.now().toString();
      const getRetryStub = sinon.stub().returns(false);
      const error = new Error('Dangit!');
      const { runner, store } = await readyToRunStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: { interval: '1m' },
          startedAt: new Date(),
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            getRetry: getRetryStub,
            createTaskRunner: () => ({
              async run() {
                throw error;
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.update).toHaveBeenCalledTimes(1);
      sinon.assert.notCalled(getRetryStub);
      const instance = store.update.mock.calls[0][0];

      const nextIntervalDelay = 60000; // 1m
      const expectedRunAt = new Date(Date.now() + nextIntervalDelay);
      expect(instance.runAt.getTime()).toEqual(expectedRunAt.getTime());
      expect(instance.enabled).not.toBeDefined();
    });

    test('Fails non-recurring task when maxAttempts reached', async () => {
      const id = _.random(1, 20).toString();
      const initialAttempts = 3;
      const { runner, store } = await readyToRunStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: undefined,
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            maxAttempts: 3,
            createTaskRunner: () => ({
              run: async () => {
                throw new Error();
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.update).toHaveBeenCalledTimes(1);
      const instance = store.update.mock.calls[0][0];
      expect(instance.attempts).toEqual(3);
      expect(instance.status).toEqual('failed');
      expect(instance.retryAt!).toBeNull();
      expect(instance.runAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(instance.enabled).not.toBeDefined();
    });

    test(`Doesn't fail recurring tasks when maxAttempts reached`, async () => {
      const id = _.random(1, 20).toString();
      const initialAttempts = 3;
      const intervalSeconds = 10;
      const { runner, store } = await readyToRunStageSetup({
        instance: {
          id,
          attempts: initialAttempts,
          schedule: { interval: `${intervalSeconds}s` },
          startedAt: new Date(),
          enabled: true,
        },
        definitions: {
          bar: {
            title: 'Bar!',
            maxAttempts: 3,
            createTaskRunner: () => ({
              run: async () => {
                throw new Error();
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.update).toHaveBeenCalledTimes(1);
      const instance = store.update.mock.calls[0][0];
      expect(instance.attempts).toEqual(3);
      expect(instance.status).toEqual('idle');
      expect(instance.runAt.getTime()).toEqual(
        new Date(Date.now() + intervalSeconds * 1000).getTime()
      );
      expect(instance.enabled).not.toBeDefined();
    });

    describe('TaskEvents', () => {
      test('emits TaskEvent when a task is run successfully', async () => {
        const id = _.random(1, 20).toString();
        const onTaskEvent = jest.fn();
        const { runner, instance } = await readyToRunStageSetup({
          onTaskEvent,
          instance: {
            id,
          },
          definitions: {
            bar: {
              title: 'Bar!',
              createTaskRunner: () => ({
                async run() {
                  return { state: {} };
                },
              }),
            },
          },
        });

        await runner.run();

        expect(onTaskEvent).toHaveBeenCalledWith(
          withAnyTiming(
            asTaskRunEvent(
              id,
              asOk({
                task: instance,
                persistence: TaskPersistence.NonRecurring,
                result: TaskRunResult.Success,
              })
            )
          )
        );
      });

      test('emits TaskEvent when a recurring task is run successfully', async () => {
        const id = _.random(1, 20).toString();
        const runAt = minutesFromNow(_.random(5));
        const onTaskEvent = jest.fn();
        const { runner, instance } = await readyToRunStageSetup({
          onTaskEvent,
          instance: {
            id,
            schedule: { interval: '1m' },
          },
          definitions: {
            bar: {
              title: 'Bar!',
              createTaskRunner: () => ({
                async run() {
                  return { runAt, state: {} };
                },
              }),
            },
          },
        });

        await runner.run();

        expect(onTaskEvent).toHaveBeenCalledWith(
          withAnyTiming(
            asTaskRunEvent(
              id,
              asOk({
                task: instance,
                persistence: TaskPersistence.Recurring,
                result: TaskRunResult.Success,
              })
            )
          )
        );
      });

      test('emits TaskEvent when a task run throws an error', async () => {
        const id = _.random(1, 20).toString();
        const error = new Error('Dangit!');
        const onTaskEvent = jest.fn();
        const { runner, instance } = await readyToRunStageSetup({
          onTaskEvent,
          instance: {
            id,
          },
          definitions: {
            bar: {
              title: 'Bar!',
              createTaskRunner: () => ({
                async run() {
                  throw error;
                },
              }),
            },
          },
        });
        await runner.run();

        expect(onTaskEvent).toHaveBeenCalledWith(
          withAnyTiming(
            asTaskRunEvent(
              id,
              asErr({
                error,
                task: instance,
                persistence: TaskPersistence.NonRecurring,
                result: TaskRunResult.RetryScheduled,
              })
            )
          )
        );
        expect(onTaskEvent).toHaveBeenCalledTimes(1);
      });

      test('emits TaskEvent when a task run returns an error', async () => {
        const id = _.random(1, 20).toString();
        const error = new Error('Dangit!');
        const onTaskEvent = jest.fn();
        const { runner, instance } = await readyToRunStageSetup({
          onTaskEvent,
          instance: {
            id,
            schedule: { interval: '1m' },
            startedAt: new Date(),
          },
          definitions: {
            bar: {
              title: 'Bar!',
              createTaskRunner: () => ({
                async run() {
                  return { error, state: {} };
                },
              }),
            },
          },
        });

        await runner.run();

        expect(onTaskEvent).toHaveBeenCalledWith(
          withAnyTiming(
            asTaskRunEvent(
              id,
              asErr({
                error,
                task: instance,
                persistence: TaskPersistence.Recurring,
                result: TaskRunResult.RetryScheduled,
              })
            )
          )
        );
        expect(onTaskEvent).toHaveBeenCalledTimes(1);
      });

      test('emits TaskEvent when a task returns an error and is marked as failed', async () => {
        const id = _.random(1, 20).toString();
        const error = new Error('Dangit!');
        const onTaskEvent = jest.fn();
        const {
          runner,
          store,
          instance: originalInstance,
        } = await readyToRunStageSetup({
          onTaskEvent,
          instance: {
            id,
            startedAt: new Date(),
            enabled: true,
          },
          definitions: {
            bar: {
              title: 'Bar!',
              getRetry: () => false,
              createTaskRunner: () => ({
                async run() {
                  return { error, state: {} };
                },
              }),
            },
          },
        });

        await runner.run();

        const instance = store.update.mock.calls[0][0];
        expect(instance.status).toBe('failed');
        expect(instance.enabled).not.toBeDefined();

        expect(onTaskEvent).toHaveBeenCalledWith(
          withAnyTiming(
            asTaskRunEvent(
              id,
              asErr({
                error,
                task: originalInstance,
                persistence: TaskPersistence.NonRecurring,
                result: TaskRunResult.Failed,
              })
            )
          )
        );
        expect(onTaskEvent).toHaveBeenCalledTimes(1);
      });
    });

    test('does not update saved object if task expires', async () => {
      const id = _.random(1, 20).toString();
      const onTaskEvent = jest.fn();
      const error = new Error('Dangit!');
      const { runner, store, usageCounter, logger } = await readyToRunStageSetup({
        onTaskEvent,
        instance: {
          id,
          startedAt: moment().subtract(5, 'm').toDate(),
        },
        definitions: {
          bar: {
            title: 'Bar!',
            timeout: '1m',
            getRetry: () => false,
            createTaskRunner: () => ({
              async run() {
                return { error, state: {}, runAt: moment().add(1, 'm').toDate() };
              },
            }),
          },
        },
      });

      await runner.run();

      expect(store.update).not.toHaveBeenCalled();
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'taskManagerUpdateSkippedDueToTaskExpiration',
        counterType: 'taskManagerTaskRunner',
        incrementBy: 1,
      });
      expect(logger.warn).toHaveBeenCalledWith(
        `Skipping reschedule for task bar \"${id}\" due to the task expiring`
      );
    });

    test('Prints debug logs on task start/end', async () => {
      const { runner, logger } = await readyToRunStageSetup({
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                return { state: {} };
              },
            }),
          },
        },
      });
      await runner.run();

      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenNthCalledWith(1, 'Running task bar "foo"', {
        tags: ['task:start', 'foo', 'bar'],
      });
      expect(logger.debug).toHaveBeenNthCalledWith(2, 'Task bar "foo" ended', {
        tags: ['task:end', 'foo', 'bar'],
      });
    });

    test('Prints debug logs on task start/end even if it throws error', async () => {
      const { runner, logger } = await readyToRunStageSetup({
        definitions: {
          bar: {
            title: 'Bar!',
            createTaskRunner: () => ({
              async run() {
                throw new Error();
              },
            }),
          },
        },
      });
      await runner.run();

      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenNthCalledWith(1, 'Running task bar "foo"', {
        tags: ['task:start', 'foo', 'bar'],
      });
      expect(logger.debug).toHaveBeenNthCalledWith(2, 'Task bar "foo" ended', {
        tags: ['task:end', 'foo', 'bar'],
      });
    });
  });

  interface TestOpts {
    instance?: Partial<ConcreteTaskInstance>;
    definitions?: TaskDefinitionRegistry;
    onTaskEvent?: jest.Mock<(event: TaskEvent<unknown, unknown>) => void>;
  }

  function withAnyTiming(taskRun: TaskRun) {
    return {
      ...taskRun,
      timing: {
        start: expect.any(Number),
        stop: expect.any(Number),
        eventLoopBlockMs: expect.any(Number),
      },
    };
  }

  function mockInstance(instance: Partial<ConcreteTaskInstance> = {}) {
    return Object.assign(
      {
        id: 'foo',
        taskType: 'bar',
        sequenceNumber: 32,
        primaryTerm: 32,
        runAt: new Date(),
        scheduledAt: new Date(),
        startedAt: new Date(),
        retryAt: null,
        attempts: 0,
        params: {},
        scope: ['reporting'],
        state: {},
        status: 'idle',
        user: 'example',
        ownerId: null,
        traceparent: 'apmTraceparent',
      },
      instance
    );
  }

  async function testOpts(stage: TaskRunningStage, opts: TestOpts) {
    const callCluster = sinon.stub();
    const createTaskRunner = sinon.stub();
    const logger = mockLogger();

    const instance = mockInstance(opts.instance);

    const store = taskStoreMock.create();
    const usageCounter = usageCountersServiceMock.createSetupContract().createUsageCounter('test');

    store.update.mockResolvedValue(instance);

    const definitions = new TaskTypeDictionary(logger);
    definitions.registerTaskDefinitions({
      testbar: {
        title: 'Bar!',
        createTaskRunner,
      },
    });
    if (opts.definitions) {
      definitions.registerTaskDefinitions(opts.definitions);
    }

    const runner = new TaskManagerRunner({
      defaultMaxAttempts: 5,
      beforeRun: (context) => Promise.resolve(context),
      beforeMarkRunning: (context) => Promise.resolve(context),
      logger,
      store,
      instance,
      definitions,
      onTaskEvent: opts.onTaskEvent,
      executionContext,
      usageCounter,
      eventLoopDelayConfig: {
        monitor: true,
        warn_threshold: 5000,
      },
    });

    if (stage === TaskRunningStage.READY_TO_RUN) {
      await runner.markTaskAsRunning();
      // as we're testing the ReadyToRun stage specifically, clear mocks cakked by setup
      store.update.mockClear();
      if (opts.onTaskEvent) {
        opts.onTaskEvent.mockClear();
      }
    }

    return {
      callCluster,
      createTaskRunner,
      runner,
      logger,
      store,
      instance,
      usageCounter,
    };
  }
});
