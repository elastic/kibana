/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { TaskPool, TaskPoolRunResult } from './task_pool';
import { mockLogger, resolvable, sleep } from './test_utils';
import { asOk } from './lib/result_type';
import { SavedObjectsErrorHelpers } from '../../../../src/core/server';
import moment from 'moment';

describe('TaskPool', () => {
  test('occupiedWorkers are a sum of running tasks', async () => {
    const pool = new TaskPool({
      maxWorkers: 200,
      logger: mockLogger(),
    });

    const result = await pool.run([{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }]);

    expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
    expect(pool.occupiedWorkers).toEqual(3);
  });

  test('availableWorkers are a function of total_capacity - occupiedWorkers', async () => {
    const pool = new TaskPool({
      maxWorkers: 10,
      logger: mockLogger(),
    });

    const result = await pool.run([{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }]);

    expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
    expect(pool.availableWorkers).toEqual(7);
  });

  test('does not run tasks that are beyond its available capacity', async () => {
    const pool = new TaskPool({
      maxWorkers: 2,
      logger: mockLogger(),
    });

    const shouldRun = mockRun();
    const shouldNotRun = mockRun();

    const result = await pool.run([
      { ...mockTask(), run: shouldRun },
      { ...mockTask(), run: shouldRun },
      { ...mockTask(), run: shouldNotRun },
    ]);

    expect(result).toEqual(TaskPoolRunResult.RanOutOfCapacity);
    expect(pool.availableWorkers).toEqual(0);
    expect(shouldRun).toHaveBeenCalledTimes(2);
    expect(shouldNotRun).not.toHaveBeenCalled();
  });

  test('should log when marking a Task as running fails', async () => {
    const logger = mockLogger();
    const pool = new TaskPool({
      maxWorkers: 2,
      logger,
    });

    const taskFailedToMarkAsRunning = mockTask();
    taskFailedToMarkAsRunning.markTaskAsRunning.mockImplementation(async () => {
      throw new Error(`Mark Task as running has failed miserably`);
    });

    const result = await pool.run([mockTask(), taskFailedToMarkAsRunning, mockTask()]);

    expect(logger.error.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Failed to mark Task TaskType \\"shooooo\\" as running: Mark Task as running has failed miserably",
      ]
    `);

    expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
  });

  test('should log when running a Task fails', async () => {
    const logger = mockLogger();
    const pool = new TaskPool({
      maxWorkers: 3,
      logger,
    });

    const taskFailedToRun = mockTask();
    taskFailedToRun.run.mockImplementation(async () => {
      throw new Error(`Run Task has failed miserably`);
    });

    const result = await pool.run([mockTask(), taskFailedToRun, mockTask()]);

    expect(logger.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Task TaskType \\"shooooo\\" failed in attempt to run: Run Task has failed miserably",
      ]
    `);

    expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
  });

  test('should not log when running a Task fails due to the Task SO having been deleted while in flight', async () => {
    const logger = mockLogger();
    const pool = new TaskPool({
      maxWorkers: 3,
      logger,
    });

    const taskFailedToRun = mockTask();
    taskFailedToRun.run.mockImplementation(async () => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError('task', taskFailedToRun.id);
    });

    const result = await pool.run([mockTask(), taskFailedToRun, mockTask()]);

    expect(logger.debug.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Task TaskType \\"shooooo\\" failed in attempt to run: Saved object [task/foo] not found",
      ]
    `);
    expect(logger.warn).not.toHaveBeenCalled();

    expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
  });

  test('Running a task which fails still takes up capacity', async () => {
    const logger = mockLogger();
    const pool = new TaskPool({
      maxWorkers: 1,
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
      maxWorkers: 1,
      logger: mockLogger(),
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
    expect(pool.occupiedWorkers).toEqual(1);
    expect(pool.availableWorkers).toEqual(0);

    await firstWork;
    sinon.assert.calledOnce(firstRun);
    sinon.assert.notCalled(secondRun);

    expect(pool.occupiedWorkers).toEqual(0);
    await pool.run([{ ...mockTask(), run: secondRun }]);
    expect(pool.occupiedWorkers).toEqual(1);

    expect(pool.availableWorkers).toEqual(0);

    await secondWork;

    expect(pool.occupiedWorkers).toEqual(0);
    expect(pool.availableWorkers).toEqual(1);
    sinon.assert.calledOnce(secondRun);
  });

  test('run cancels expired tasks prior to running new tasks', async () => {
    const logger = mockLogger();
    const pool = new TaskPool({
      maxWorkers: 2,
      logger,
    });

    const expired = resolvable();
    const shouldRun = sinon.spy(() => Promise.resolve());
    const shouldNotRun = sinon.spy(() => Promise.resolve());
    const now = new Date();
    const result = await pool.run([
      {
        ...mockTask(),
        async run() {
          this.isExpired = true;
          expired.resolve();
          await sleep(10);
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
        ...mockTask(),
        async run() {
          await sleep(10);
          return asOk({ state: {} });
        },
        cancel: shouldNotRun,
      },
    ]);

    expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
    expect(pool.occupiedWorkers).toEqual(2);
    expect(pool.availableWorkers).toEqual(0);

    await expired;

    expect(await pool.run([{ ...mockTask() }])).toBeTruthy();
    sinon.assert.calledOnce(shouldRun);
    sinon.assert.notCalled(shouldNotRun);

    expect(pool.occupiedWorkers).toEqual(2);
    expect(pool.availableWorkers).toEqual(0);

    expect(logger.warn).toHaveBeenCalledWith(
      `Cancelling task TaskType "shooooo" as it expired at ${now.toISOString()} after running for 05m 30s (with timeout set at 5m).`
    );
  });

  test('logs if cancellation errors', async () => {
    const logger = mockLogger();
    const pool = new TaskPool({
      logger,
      maxWorkers: 20,
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

    expect(pool.occupiedWorkers).toEqual(0);

    // Allow the task to cancel...
    await cancelled;

    expect(logger.error.mock.calls[0][0]).toMatchInlineSnapshot(
      `"Failed to cancel task \\"shooooo!\\": Error: Dern!"`
    );
  });

  function mockRun() {
    return jest.fn(async () => {
      await sleep(0);
      return asOk({ state: {} });
    });
  }

  function mockTask() {
    return {
      isExpired: false,
      id: 'foo',
      cancel: async () => undefined,
      markTaskAsRunning: jest.fn(async () => true),
      run: mockRun(),
      toString: () => `TaskType "shooooo"`,
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
          createTaskRunner: jest.fn(),
        };
      },
    };
  }
});
