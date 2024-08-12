/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { of, Subject } from 'rxjs';
import { TaskCost } from '../task';
import { CostCapacity } from './cost_capacity';
import { mockTask } from './test_utils';

const logger = loggingSystemMock.create().get();

describe('CostCapacity', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('capacity responds to changes from capacity$ observable', () => {
    const capacity$ = new Subject<number>();
    const pool = new CostCapacity({ capacity$, logger });

    expect(pool.capacity).toBe(0);

    capacity$.next(20);
    expect(pool.capacity).toBe(40);

    capacity$.next(16);
    expect(pool.capacity).toBe(32);

    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      `Task pool now using 40 as the max allowed cost which is based on a capacity of 20`
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      `Task pool now using 32 as the max allowed cost which is based on a capacity of 16`
    );
  });

  test('usedCapacity returns the sum of costs of tasks in the pool', () => {
    const pool = new CostCapacity({ capacity$: of(10), logger });

    const tasksInPool = new Map([
      ['1', { ...mockTask() }],
      ['2', { ...mockTask({}, { cost: TaskCost.Tiny }) }],
      ['3', { ...mockTask() }],
    ]);

    expect(pool.usedCapacity(tasksInPool)).toBe(5);
  });

  test('usedCapacityPercentage returns the percentage of capacity used based on cost of tasks in the pool', () => {
    const pool = new CostCapacity({ capacity$: of(10), logger });

    const tasksInPool = new Map([
      ['1', { ...mockTask() }],
      ['2', { ...mockTask({}, { cost: TaskCost.Tiny }) }],
      ['3', { ...mockTask() }],
    ]);

    expect(pool.usedCapacityPercentage(tasksInPool)).toBe(25);
  });

  test('usedCapacityByType returns the sum of of costs of tasks of specified type in the pool', () => {
    const pool = new CostCapacity({ capacity$: of(10), logger });

    const tasksInPool = [
      { ...mockTask({}, { type: 'type1' }) },
      { ...mockTask({}, { type: 'type1', cost: TaskCost.Tiny }) },
      { ...mockTask({}, { type: 'type2' }) },
    ];

    expect(pool.getUsedCapacityByType(tasksInPool, 'type1')).toBe(3);
    expect(pool.getUsedCapacityByType(tasksInPool, 'type2')).toBe(2);
    expect(pool.getUsedCapacityByType(tasksInPool, 'type3')).toBe(0);
  });

  test('availableCapacity returns the full available capacity when no task type is defined', () => {
    const pool = new CostCapacity({ capacity$: of(10), logger });

    const tasksInPool = new Map([
      ['1', { ...mockTask() }],
      ['2', { ...mockTask({}, { cost: TaskCost.Tiny }) }],
      ['3', { ...mockTask() }],
    ]);

    expect(pool.availableCapacity(tasksInPool)).toBe(15);
  });

  test('availableCapacity returns the full available capacity when task type with no maxConcurrency is provided', () => {
    const pool = new CostCapacity({ capacity$: of(10), logger });

    const tasksInPool = new Map([
      ['1', { ...mockTask() }],
      ['2', { ...mockTask({}, { cost: TaskCost.Tiny }) }],
      ['3', { ...mockTask() }],
    ]);

    expect(
      pool.availableCapacity(tasksInPool, {
        type: 'type1',
        cost: TaskCost.Normal,
        createTaskRunner: jest.fn(),
        timeout: '5m',
      })
    ).toBe(15);
  });

  test('availableCapacity returns the available capacity for the task type when task type with maxConcurrency is provided', () => {
    const pool = new CostCapacity({ capacity$: of(10), logger });

    const tasksInPool = new Map([
      ['1', { ...mockTask({}, { type: 'type1' }) }],
      ['2', { ...mockTask({}, { cost: TaskCost.Tiny }) }],
      ['3', { ...mockTask() }],
    ]);

    expect(
      pool.availableCapacity(tasksInPool, {
        type: 'type1',
        maxConcurrency: 3,
        cost: TaskCost.Normal,
        createTaskRunner: jest.fn(),
        timeout: '5m',
      })
    ).toBe(4);
  });

  describe('determineTasksToRunBasedOnCapacity', () => {
    test('runs all tasks if there is capacity', () => {
      const pool = new CostCapacity({ capacity$: of(10), logger });
      const tasks = [{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }];
      const [tasksToRun, leftoverTasks] = pool.determineTasksToRunBasedOnCapacity(tasks, 20);

      expect(tasksToRun).toEqual(tasks);
      expect(leftoverTasks).toEqual([]);
    });

    test('runs task in order until capacity is reached', () => {
      const pool = new CostCapacity({ capacity$: of(10), logger });
      const tasks = [
        { ...mockTask() },
        { ...mockTask() },
        { ...mockTask() },
        { ...mockTask({}, { cost: TaskCost.ExtraLarge }) },
        { ...mockTask({}, { cost: TaskCost.ExtraLarge }) },
        // technically have capacity for these tasks if we skip the previous task, but we're running
        // in order to avoid possibly starving large cost tasks
        { ...mockTask() },
        { ...mockTask() },
      ];
      const [tasksToRun, leftoverTasks] = pool.determineTasksToRunBasedOnCapacity(tasks, 20);

      expect(tasksToRun).toEqual([tasks[0], tasks[1], tasks[2], tasks[3]]);
      expect(leftoverTasks).toEqual([tasks[4], tasks[5], tasks[6]]);
    });

    test('does not run tasks if there is no capacity', () => {
      const pool = new CostCapacity({ capacity$: of(10), logger });
      const tasks = [{ ...mockTask() }, { ...mockTask() }, { ...mockTask() }];
      const [tasksToRun, leftoverTasks] = pool.determineTasksToRunBasedOnCapacity(tasks, 1);

      expect(tasksToRun).toEqual([]);
      expect(leftoverTasks).toEqual(tasks);
    });
  });
});
