/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import sinon from 'sinon';
import { of, Subject } from 'rxjs';
import { TaskPool, TaskPoolRunResult } from './task_pool';
import { resolvable, sleep } from '../test_utils';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Logger } from '@kbn/core/server';
import { asOk } from '../lib/result_type';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { TaskCost } from '../task';
import * as CostCapacityModule from './cost_capacity';
import * as WorkerCapacityModule from './worker_capacity';
import { capacityMock } from './capacity.mock';
import { CLAIM_STRATEGY_UPDATE_BY_QUERY, CLAIM_STRATEGY_MGET } from '../config';
import { mockRun, mockTask } from './test_utils';
import { TaskTypeDictionary } from '../task_type_dictionary';

jest.mock('../constants', () => ({
  CONCURRENCY_ALLOW_LIST_BY_TASK_TYPE: ['report', 'quickReport'],
}));

describe('TaskPool', () => {
  const costCapacityMock = capacityMock.create();
  const workerCapacityMock = capacityMock.create();
  const logger = loggingSystemMock.create().get();

  const definitions = new TaskTypeDictionary(logger);
  definitions.registerTaskDefinitions({
    report: {
      title: 'report',
      maxConcurrency: 1,
      cost: TaskCost.ExtraLarge,
      createTaskRunner: jest.fn(),
    },
    quickReport: {
      title: 'quickReport',
      maxConcurrency: 5,
      createTaskRunner: jest.fn(),
    },
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2021, 12, 30));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('uses the correct capacity calculator based on the strategy', () => {
    let costCapacitySpy: jest.SpyInstance;
    let workerCapacitySpy: jest.SpyInstance;
    beforeEach(() => {
      costCapacitySpy = jest
        .spyOn(CostCapacityModule, 'CostCapacity')
        .mockImplementation(() => costCapacityMock);

      workerCapacitySpy = jest
        .spyOn(WorkerCapacityModule, 'WorkerCapacity')
        .mockImplementation(() => workerCapacityMock);
    });

    afterEach(() => {
      costCapacitySpy.mockRestore();
      workerCapacitySpy.mockRestore();
    });

    test('uses CostCapacity to calculate capacity when strategy is mget', () => {
      new TaskPool({ capacity$: of(20), definitions, logger, strategy: CLAIM_STRATEGY_MGET });

      expect(CostCapacityModule.CostCapacity).toHaveBeenCalledTimes(1);
      expect(WorkerCapacityModule.WorkerCapacity).not.toHaveBeenCalled();
    });

    test('uses WorkerCapacity to calculate capacity when strategy is default', () => {
      new TaskPool({
        capacity$: of(20),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
      });

      expect(CostCapacityModule.CostCapacity).not.toHaveBeenCalled();
      expect(WorkerCapacityModule.WorkerCapacity).toHaveBeenCalledTimes(1);
    });

    test('uses WorkerCapacity to calculate capacity when strategy is unrecognized', () => {
      new TaskPool({ capacity$: of(20), definitions, logger, strategy: 'any old strategy' });

      expect(CostCapacityModule.CostCapacity).not.toHaveBeenCalled();
      expect(WorkerCapacityModule.WorkerCapacity).toHaveBeenCalledTimes(1);
    });
  });

  describe('with CLAIM_STRATEGY_UPDATE_BY_QUERY', () => {
    test('usedCapacity is the number running tasks', async () => {
      const pool = new TaskPool({
        capacity$: of(10),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
      });

      const result = await pool.run([{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }]);

      expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
      expect(pool.usedCapacity).toEqual(3);
    });

    test('availableCapacity are a function of total_capacity - usedCapacity', async () => {
      const pool = new TaskPool({
        capacity$: of(10),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
      });

      const result = await pool.run([{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }]);

      expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
      expect(pool.availableCapacity()).toEqual(7);
    });

    test('availableCapacity is 0 until capacity$ pushes a value', async () => {
      const capacity$ = new Subject<number>();
      const pool = new TaskPool({
        capacity$,
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
      });

      expect(pool.availableCapacity()).toEqual(0);
      capacity$.next(10);
      expect(pool.availableCapacity()).toEqual(10);
    });

    test('does not run tasks that are beyond its available capacity', async () => {
      const pool = new TaskPool({
        capacity$: of(2),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
      });

      const shouldRun = mockRun();
      const shouldNotRun = mockRun();

      const result = await pool.run([
        { ...mockTask(), run: shouldRun },
        { ...mockTask(), run: shouldRun },
        { ...mockTask(), run: shouldNotRun },
      ]);

      expect(result).toEqual(TaskPoolRunResult.RanOutOfCapacity);
      expect(pool.availableCapacity()).toEqual(0);
      expect(shouldRun).toHaveBeenCalledTimes(2);
      expect(shouldNotRun).not.toHaveBeenCalled();
    });

    test('should log and throw an error when marking a Task as running fails', async () => {
      const pool = new TaskPool({
        capacity$: of(3),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
      });

      const taskFailedToMarkAsRunning = mockTask();
      taskFailedToMarkAsRunning.markTaskAsRunning.mockImplementation(async () => {
        throw new Error(`Mark Task as running has failed miserably`);
      });

      await expect(
        pool.run([mockTask(), taskFailedToMarkAsRunning, mockTask()])
      ).rejects.toThrowError('Mark Task as running has failed miserably');

      expect((logger as jest.Mocked<Logger>).error.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Failed to mark Task TaskType \\"shooooo\\" as running: Mark Task as running has failed miserably",
        ]
      `);
    });

    test('should log when running a Task fails', async () => {
      const pool = new TaskPool({
        capacity$: of(3),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
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
      const pool = new TaskPool({
        capacity$: of(3),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
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
      const pool = new TaskPool({
        capacity$: of(1),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
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
        capacity$: of(1),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
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
      expect(pool.usedCapacity).toEqual(1);
      expect(pool.availableCapacity()).toEqual(0);

      await firstWork;
      sinon.assert.calledOnce(firstRun);
      sinon.assert.notCalled(secondRun);

      expect(pool.usedCapacity).toEqual(0);
      await pool.run([{ ...mockTask(), run: secondRun }]);
      expect(pool.usedCapacity).toEqual(1);

      expect(pool.availableCapacity()).toEqual(0);

      await secondWork;

      expect(pool.usedCapacity).toEqual(0);
      expect(pool.availableCapacity()).toEqual(1);
      sinon.assert.calledOnce(secondRun);
    });

    test('run cancels expired tasks prior to running new tasks', async () => {
      const pool = new TaskPool({
        capacity$: of(2),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
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
      expect(pool.usedCapacity).toEqual(2);
      expect(pool.availableCapacity()).toEqual(0);

      // release first stage in task so that it has time to expire, but not complete
      haltUntilWeAfterFirstRun.resolve();
      await taskHasExpired;

      expect(await pool.run([{ ...mockTask({ id: '3' }) }])).toBeTruthy();

      sinon.assert.calledOnce(shouldRun);
      sinon.assert.notCalled(shouldNotRun);

      expect(pool.usedCapacity).toEqual(1);
      expect(pool.availableCapacity()).toEqual(1);

      haltTaskSoThatItCanBeCanceled.resolve();

      expect(logger.warn).toHaveBeenCalledWith(
        `Cancelling task TaskType "shooooo" as it expired at ${now.toISOString()} after running for 05m 30s (with timeout set at 5m).`
      );
    });

    test('calls to availableWorkers ensures we cancel expired tasks', async () => {
      const pool = new TaskPool({
        capacity$: of(1),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
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
      expect(pool.usedCapacity).toEqual(1);
      // The call to `availableCapacity` will clear the expired task so it's 1 instead of 0
      expect(pool.availableCapacity()).toEqual(1);
      sinon.assert.calledOnce(cancel);

      expect(pool.usedCapacity).toEqual(0);
      expect(pool.availableCapacity()).toEqual(1);
      // ensure cancel isn't called twice
      sinon.assert.calledOnce(cancel);
      taskHasExpired.resolve();
    });

    test('logs if cancellation errors', async () => {
      const pool = new TaskPool({
        capacity$: of(10),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
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

      expect(pool.usedCapacity).toEqual(0);

      // Allow the task to cancel...
      await cancelled;

      expect((logger as jest.Mocked<Logger>).error.mock.calls[0][0]).toMatchInlineSnapshot(
        `"Failed to cancel task \\"shooooo!\\": Error: Dern!"`
      );
    });

    test('only allows one task with the same id in the task pool', async () => {
      const pool = new TaskPool({
        capacity$: of(2),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
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
  });

  describe('with CLAIM_STRATEGY_MGET', () => {
    test('usedCapacity is the sum of the cost of running tasks', async () => {
      const pool = new TaskPool({
        capacity$: of(10),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_MGET,
      });

      const result = await pool.run([{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }]);

      expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
      expect(pool.usedCapacity).toEqual(3 * TaskCost.Normal);
    });

    test('availableCapacity are a function of total_capacity - usedCapacity', async () => {
      const pool = new TaskPool({
        capacity$: of(10),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_MGET,
      });

      const result = await pool.run([{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }]);

      expect(result).toEqual(TaskPoolRunResult.RunningAllClaimedTasks);
      expect(pool.availableCapacity()).toEqual(14);
    });

    test('availableCapacity is 0 until capacity$ pushes a value', async () => {
      const capacity$ = new Subject<number>();
      const pool = new TaskPool({ capacity$, definitions, logger, strategy: CLAIM_STRATEGY_MGET });

      expect(pool.availableCapacity()).toEqual(0);
      capacity$.next(20);
      expect(pool.availableCapacity()).toEqual(40);
    });

    test('does not run tasks that are beyond its available capacity', async () => {
      const pool = new TaskPool({
        capacity$: of(2),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_MGET,
      });

      const shouldRun = mockRun();
      const shouldNotRun = mockRun();

      const result = await pool.run([
        { ...mockTask(), run: shouldRun },
        { ...mockTask(), run: shouldRun },
        { ...mockTask(), run: shouldNotRun },
      ]);

      expect(result).toEqual(TaskPoolRunResult.RanOutOfCapacity);
      expect(pool.availableCapacity()).toEqual(0);
      expect(shouldRun).toHaveBeenCalledTimes(2);
      expect(shouldNotRun).not.toHaveBeenCalled();
    });

    test('should log and throw an error when marking a Task as running fails', async () => {
      const pool = new TaskPool({
        capacity$: of(6),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_MGET,
      });

      const taskFailedToMarkAsRunning = mockTask();
      taskFailedToMarkAsRunning.markTaskAsRunning.mockImplementation(async () => {
        throw new Error(`Mark Task as running has failed miserably`);
      });

      await expect(
        pool.run([mockTask(), taskFailedToMarkAsRunning, mockTask()])
      ).rejects.toThrowError('Mark Task as running has failed miserably');

      expect((logger as jest.Mocked<Logger>).error.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Failed to mark Task TaskType \\"shooooo\\" as running: Mark Task as running has failed miserably",
      ]
    `);
    });

    test('should log when running a Task fails', async () => {
      const pool = new TaskPool({
        capacity$: of(3),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_MGET,
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
      const pool = new TaskPool({
        capacity$: of(3),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_MGET,
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
      const pool = new TaskPool({
        capacity$: of(1),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_MGET,
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
        capacity$: of(1),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_MGET,
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
      expect(pool.usedCapacity).toEqual(2);
      expect(pool.availableCapacity()).toEqual(0);

      await firstWork;
      sinon.assert.calledOnce(firstRun);
      sinon.assert.notCalled(secondRun);

      expect(pool.usedCapacity).toEqual(0);
      await pool.run([{ ...mockTask(), run: secondRun }]);
      expect(pool.usedCapacity).toEqual(2);

      expect(pool.availableCapacity()).toEqual(0);

      await secondWork;

      expect(pool.usedCapacity).toEqual(0);
      expect(pool.availableCapacity()).toEqual(2);
      sinon.assert.calledOnce(secondRun);
    });

    test('run cancels expired tasks prior to running new tasks', async () => {
      const pool = new TaskPool({
        capacity$: of(2),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_MGET,
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
      expect(pool.usedCapacity).toEqual(4);
      expect(pool.availableCapacity()).toEqual(0);

      // release first stage in task so that it has time to expire, but not complete
      haltUntilWeAfterFirstRun.resolve();
      await taskHasExpired;

      expect(await pool.run([{ ...mockTask({ id: '3' }) }])).toBeTruthy();

      sinon.assert.calledOnce(shouldRun);
      sinon.assert.notCalled(shouldNotRun);

      expect(pool.usedCapacity).toEqual(2);
      expect(pool.availableCapacity()).toEqual(2);

      haltTaskSoThatItCanBeCanceled.resolve();

      expect(logger.warn).toHaveBeenCalledWith(
        `Cancelling task TaskType "shooooo" as it expired at ${now.toISOString()} after running for 05m 30s (with timeout set at 5m).`
      );
    });

    test('calls to availableWorkers ensures we cancel expired tasks', async () => {
      const pool = new TaskPool({
        capacity$: of(1),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_MGET,
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
      expect(pool.usedCapacity).toEqual(2);
      // The call to `availableCapacity` will clear the expired task so it's 2 instead of 0
      expect(pool.availableCapacity()).toEqual(2);
      sinon.assert.calledOnce(cancel);

      expect(pool.usedCapacity).toEqual(0);
      expect(pool.availableCapacity()).toEqual(2);
      // ensure cancel isn't called twice
      sinon.assert.calledOnce(cancel);
      taskHasExpired.resolve();
    });

    test('logs if cancellation errors', async () => {
      const pool = new TaskPool({
        capacity$: of(10),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_MGET,
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

      expect(pool.usedCapacity).toEqual(0);

      // Allow the task to cancel...
      await cancelled;

      expect((logger as jest.Mocked<Logger>).error.mock.calls[0][0]).toMatchInlineSnapshot(
        `"Failed to cancel task \\"shooooo!\\": Error: Dern!"`
      );
    });

    test('only allows one task with the same id in the task pool', async () => {
      const pool = new TaskPool({
        capacity$: of(2),
        definitions,
        logger,
        strategy: CLAIM_STRATEGY_MGET,
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
  });
});
