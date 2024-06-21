/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import sinon from 'sinon';
import { TaskPool, TaskPoolRunResult } from './task_pool';
import { resolvable, sleep } from './test_utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Logger } from '@kbn/core/server';
import { asOk } from './lib/result_type';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { TaskRunningStage } from './task_running';
import { TaskCost } from './task';

describe('TaskPool', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2021, 12, 30));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('occupiedCapacity is a sum of running tasks cost', async () => {
    const pool = new TaskPool({
      totalCapacity: 400,
      logger: loggingSystemMock.create().get(),
    });

    const result = await pool.run([{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }]);

    expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
    expect(pool.occupiedCapacity).toEqual(6);
  });

  test('availableCapacity is a function of availableCapacity - occupiedCapacity', async () => {
    const pool = new TaskPool({
      totalCapacity: 20,
      logger: loggingSystemMock.create().get(),
    });

    const result = await pool.run([{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }]);

    expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
    expect(pool.availableCapacity).toEqual(14);
  });

  test('does not run tasks that are beyond its available capacity', async () => {
    const pool = new TaskPool({
      totalCapacity: 4,
      logger: loggingSystemMock.create().get(),
    });

    const shouldRun = mockRun();
    const shouldNotRun = mockRun();

    const result = await pool.run([
      { ...mockTask(), run: shouldRun },
      { ...mockTask(), run: shouldRun },
      { ...mockTask(), run: shouldNotRun },
    ]);

    expect(result).toEqual(TaskPoolRunResult.RanOutOfCapacity);
    expect(pool.availableCapacity).toEqual(0);
    expect(shouldRun).toHaveBeenCalledTimes(2);
    expect(shouldNotRun).not.toHaveBeenCalled();
  });

  test('should log when marking a Task as running fails', async () => {
    const logger = loggingSystemMock.create().get();
    const pool = new TaskPool({
      totalCapacity: 4,
      logger,
    });

    const taskFailedToMarkAsRunning = mockTask();
    taskFailedToMarkAsRunning.markTaskAsRunning.mockImplementation(async () => {
      throw new Error(`Mark Task as running has failed miserably`);
    });

    const result = await pool.run([mockTask(), taskFailedToMarkAsRunning]);

    expect((logger as jest.Mocked<Logger>).error.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Failed to mark Task TaskType \\"shooooo\\" as running: Mark Task as running has failed miserably",
      ]
    `);

    // RunningAllClaimedTasks because we no longer continue to run more tasks after failing to mark some as running
    // while there still is capacity
    expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
  });

  test('should log when running a Task fails', async () => {
    const logger = loggingSystemMock.create().get();
    const pool = new TaskPool({
      totalCapacity: 6,
      logger,
    });

    const taskFailedToRun = mockTask();
    taskFailedToRun.run.mockImplementation(async () => {
      throw new Error(`Run Task has failed miserably`);
    });

    const result = await pool.run([mockTask(), taskFailedToRun, mockTask()]);

    expect((logger as jest.Mocked<Logger>).warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Task TaskType \\"shooooo\\" failed in attempt to run: Run Task has failed miserably",
      ]
    `);

    expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
  });

  test('should not log when running a Task fails due to the Task SO having been deleted while in flight', async () => {
    const logger = loggingSystemMock.create().get();
    const pool = new TaskPool({
      totalCapacity: 6,
      logger,
    });

    const taskFailedToRun = mockTask();
    taskFailedToRun.run.mockImplementation(async () => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError('task', taskFailedToRun.id);
    });

    const result = await pool.run([mockTask(), taskFailedToRun, mockTask()]);

    expect(logger.debug).toHaveBeenCalledWith(
      `Task TaskType "shooooo" failed in attempt to run: Saved object [task/${taskFailedToRun.id}] not found`
    );
    expect(logger.warn).not.toHaveBeenCalled();

    expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
  });

  test('Running a task which fails still takes up capacity', async () => {
    const logger = loggingSystemMock.create().get();
    const pool = new TaskPool({
      totalCapacity: 2,
      logger,
    });

    const taskFailedToRun = mockTask();
    taskFailedToRun.run.mockImplementation(async () => {
      await sleep(0);
      throw new Error(`Run Task has failed miserably`);
    });

    const result = await pool.run([taskFailedToRun, mockTask()]);

    expect(result).toEqual(TaskPoolRunResult.RanOutOfCapacity);
  });

  test('clears up capacity when a task completes', async () => {
    const pool = new TaskPool({
      totalCapacity: 2,
      logger: loggingSystemMock.create().get(),
    });

    const firstWork = resolvable();
    const firstRun = sinon.spy(async () => {
      await sleep(0);
      firstWork.resolve();
      return asOk({ state: {} });
    });
    const secondWork = resolvable();
    const secondRun = sinon.spy(async () => {
      await sleep(0);
      secondWork.resolve();
      return asOk({ state: {} });
    });

    const result = await pool.run([
      { ...mockTask(), run: firstRun },
      { ...mockTask(), run: secondRun },
    ]);

    expect(result).toEqual(TaskPoolRunResult.RanOutOfCapacity);
    expect(pool.occupiedCapacity).toEqual(2);
    expect(pool.availableCapacity).toEqual(0);

    await firstWork;
    sinon.assert.calledOnce(firstRun);
    sinon.assert.notCalled(secondRun);

    expect(pool.occupiedCapacity).toEqual(0);
    await pool.run([{ ...mockTask(), run: secondRun }]);
    expect(pool.occupiedCapacity).toEqual(2);

    expect(pool.availableCapacity).toEqual(0);

    await secondWork;

    expect(pool.occupiedCapacity).toEqual(0);
    expect(pool.availableCapacity).toEqual(2);
    sinon.assert.calledOnce(secondRun);
  });

  test('run cancels expired tasks prior to running new tasks', async () => {
    const logger = loggingSystemMock.create().get();
    const pool = new TaskPool({
      totalCapacity: 4,
      logger,
    });

    const haltUntilWeAfterFirstRun = resolvable();
    const taskHasExpired = resolvable();
    const haltTaskSoThatItCanBeCanceled = resolvable();

    const shouldRun = sinon.spy(() => Promise.resolve());
    const shouldNotRun = sinon.spy(() => Promise.resolve());
    const now = new Date();
    const result = await pool.run([
      {
        ...mockTask({ id: '1' }),
        async run() {
          await haltUntilWeAfterFirstRun;
          this.isExpired = true;
          taskHasExpired.resolve();
          await haltTaskSoThatItCanBeCanceled;
          return asOk({ state: {} });
        },
        get expiration() {
          return now;
        },
        get startedAt() {
          // 5 and a half minutes
          return moment(now).subtract(5, 'm').subtract(30, 's').toDate();
        },
        cancel: shouldRun,
      },
      {
        ...mockTask({ id: '2' }),
        async run() {
          // halt here so that we can verify that this task is counted in `occupiedWorkers`
          await haltUntilWeAfterFirstRun;
          return asOk({ state: {} });
        },
        cancel: shouldNotRun,
      },
    ]);

    expect(result).toEqual(TaskPoolRunResult.RunningAtCapacity);
    expect(pool.occupiedCapacity).toEqual(4);
    expect(pool.availableCapacity).toEqual(0);

    // release first stage in task so that it has time to expire, but not complete
    haltUntilWeAfterFirstRun.resolve();
    await taskHasExpired;

    expect(await pool.run([{ ...mockTask({ id: '3' }) }])).toBeTruthy();

    sinon.assert.calledOnce(shouldRun);
    sinon.assert.notCalled(shouldNotRun);

    expect(pool.occupiedCapacity).toEqual(2);
    expect(pool.availableCapacity).toEqual(2);

    haltTaskSoThatItCanBeCanceled.resolve();

    expect(logger.warn).toHaveBeenCalledWith(
      `Cancelling task TaskType "shooooo" as it expired at ${now.toISOString()} after running for 05m 30s (with timeout set at 5m).`
    );
  });

  test('calls to availableWorkers ensures we cancel expired tasks', async () => {
    const pool = new TaskPool({
      totalCapacity: 2,
      logger: loggingSystemMock.create().get(),
    });

    const taskIsRunning = resolvable();
    const taskHasExpired = resolvable();
    const cancel = sinon.spy(() => Promise.resolve());
    const now = new Date();
    expect(
      await pool.run([
        {
          ...mockTask(),
          async run() {
            await sleep(10);
            this.isExpired = true;
            taskIsRunning.resolve();
            await taskHasExpired;
            return asOk({ state: {} });
          },
          get expiration() {
            return new Date(now.getTime() + 10);
          },
          get startedAt() {
            return now;
          },
          cancel,
        },
      ])
    ).toEqual(TaskPoolRunResult.RunningAtCapacity);

    await taskIsRunning;

    sinon.assert.notCalled(cancel);
    expect(pool.occupiedCapacity).toEqual(2);
    // The call to `availableWorkers` will clear the expired task so it's 1 instead of 0
    expect(pool.availableCapacity).toEqual(2);
    sinon.assert.calledOnce(cancel);

    expect(pool.occupiedCapacity).toEqual(0);
    expect(pool.availableCapacity).toEqual(2);
    // ensure cancel isn't called twice
    sinon.assert.calledOnce(cancel);
    taskHasExpired.resolve();
  });

  test('logs if cancellation errors', async () => {
    const logger = loggingSystemMock.create().get();
    const pool = new TaskPool({
      logger,
      totalCapacity: 40,
    });

    const cancelled = resolvable();
    const result = await pool.run([
      {
        ...mockTask(),
        async run() {
          this.isExpired = true;
          await sleep(10);
          return asOk({ state: {} });
        },
        async cancel() {
          cancelled.resolve();
          throw new Error('Dern!');
        },
        toString: () => '"shooooo!"',
      },
    ]);

    expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
    await pool.run([]);

    expect(pool.occupiedCapacity).toEqual(0);

    // Allow the task to cancel...
    await cancelled;

    expect((logger as jest.Mocked<Logger>).error.mock.calls[0][0]).toMatchInlineSnapshot(
      `"Failed to cancel task \\"shooooo!\\": Error: Dern!"`
    );
  });

  test('only allows one task with the same id in the task pool', async () => {
    const logger = loggingSystemMock.create().get();
    const pool = new TaskPool({
      totalCapacity: 4,
      logger,
    });

    const shouldRun = mockRun();
    const shouldNotRun = mockRun();

    const taskId = uuidv4();
    const task1 = mockTask({ id: taskId, run: shouldRun });
    const task2 = mockTask({
      id: taskId,
      run: shouldNotRun,
      isSameTask() {
        return true;
      },
    });

    await pool.run([task1]);
    await pool.run([task2]);

    expect(shouldRun).toHaveBeenCalledTimes(1);
    expect(shouldNotRun).not.toHaveBeenCalled();
  });

  // This test is from https://github.com/elastic/kibana/issues/172116
  // It's not clear how to reproduce the actual error, but it is easy to
  // reproduce with the wacky test below.  It does log the exact error
  // from that issue, without the corresponding fix in task_pool.ts
  // TODO: Test still needed?
  test('works when available workers is 0 but there are tasks to run', async () => {
    const logger = loggingSystemMock.create().get();
    const pool = new TaskPool({
      totalCapacity: 4,
      logger,
    });

    const shouldRun = mockRun();

    const taskId = uuidv4();
    const task1 = mockTask({ id: taskId, run: shouldRun });

    // we need to alternate the values of `availableWorkers`.  First it
    // should be 0, then 1, then 0, then 1, etc.  This will cause task_pool.run
    // to partition tasks (0 to run, everything as leftover), then at the
    // end of run(), to check if it should recurse, it should be > 0.
    let awValue = 1;
    Object.defineProperty(pool, 'availableCapacity', {
      get() {
        return (++awValue % 2) * TaskCost.Normal;
      },
    });

    const result = await pool.run([task1]);
    expect(result).toBe(TaskPoolRunResult.RanOutOfCapacity);
  });

  function mockRun() {
    return jest.fn(async () => {
      await sleep(0);
      return asOk({ state: {} });
    });
  }

  function mockTask(overrides = {}) {
    return {
      isExpired: false,
      taskExecutionId: uuidv4(),
      id: uuidv4(),
      cancel: async () => undefined,
      markTaskAsRunning: jest.fn(async () => true),
      run: mockRun(),
      stage: TaskRunningStage.PENDING,
      toString: () => `TaskType "shooooo"`,
      isAdHocTaskAndOutOfAttempts: false,
      removeTask: jest.fn(),
      get expiration() {
        return new Date();
      },
      get startedAt() {
        return new Date();
      },
      get definition() {
        return {
          type: '',
          title: '',
          timeout: '5m',
          cost: TaskCost.Normal,
          createTaskRunner: jest.fn(),
        };
      },
      isSameTask() {
        return false;
      },
      ...overrides,
    };
  }
});
