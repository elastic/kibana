/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';

import { TaskLifecycleEvent } from './polling_lifecycle';
import { createInitialMiddleware } from './lib/middleware';
import { TaskTypeDictionary } from './task_type_dictionary';
import { mockLogger } from './test_utils';
import { asErr, asOk } from './lib/result_type';
import { FillPoolResult } from './lib/fill_pool';
import { EphemeralTaskLifecycle, EphemeralTaskLifecycleOpts } from './ephemeral_task_lifecycle';
import { v4 as uuidv4 } from 'uuid';
import { asTaskPollingCycleEvent, asTaskRunEvent, TaskPersistence } from './task_events';
import { TaskRunResult } from './task_running';
import { TaskPoolRunResult } from './task_pool';
import { TaskPoolMock } from './task_pool/task_pool.mock';
import { executionContextServiceMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from './mocks';

jest.mock('./constants', () => ({
  CONCURRENCY_ALLOW_LIST_BY_TASK_TYPE: ['report'],
}));

const executionContext = executionContextServiceMock.createSetupContract();

describe('EphemeralTaskLifecycle', () => {
  function initTaskLifecycleParams({
    config,
    ...optOverrides
  }: {
    config?: Partial<EphemeralTaskLifecycleOpts['config']>;
  } & Partial<Omit<EphemeralTaskLifecycleOpts, 'config'>> = {}) {
    const taskManagerLogger = mockLogger();
    const poolCapacity = jest.fn();
    const pool = TaskPoolMock.create(poolCapacity);
    const lifecycleEvent$ = new Subject<TaskLifecycleEvent>();
    const elasticsearchAndSOAvailability$ = new Subject<boolean>();
    const opts: EphemeralTaskLifecycleOpts = {
      logger: taskManagerLogger,
      definitions: new TaskTypeDictionary(taskManagerLogger),
      executionContext,
      config: {
        discovery: {
          active_nodes_lookback: '30s',
          interval: 10000,
        },
        kibanas_per_partition: 2,
        max_attempts: 9,
        poll_interval: 6000000,
        version_conflict_threshold: 80,
        request_capacity: 1000,
        allow_reading_invalid_state: false,
        monitored_aggregated_stats_refresh_rate: 5000,
        monitored_stats_required_freshness: 5000,
        monitored_stats_running_average_window: 50,
        monitored_stats_health_verbose_log: {
          enabled: true,
          level: 'debug',
          warn_delayed_task_start_in_seconds: 60,
        },
        monitored_task_execution_thresholds: {
          default: {
            error_threshold: 90,
            warn_threshold: 80,
          },
          custom: {},
        },
        ephemeral_tasks: {
          enabled: true,
          request_capacity: 10,
        },
        unsafe: {
          exclude_task_types: [],
          authenticate_background_task_utilization: true,
        },
        event_loop_delay: {
          monitor: true,
          warn_threshold: 5000,
        },
        worker_utilization_running_average_window: 5,
        metrics_reset_interval: 3000,
        claim_strategy: 'update_by_query',
        request_timeouts: {
          update_by_query: 1000,
        },
        auto_calculate_default_ech_capacity: false,
        ...config,
      },
      elasticsearchAndSOAvailability$,
      pool,
      lifecycleEvent: lifecycleEvent$,
      middleware: createInitialMiddleware(),
      ...optOverrides,
    };

    opts.definitions.registerTaskDefinitions({
      foo: {
        title: 'foo',
        createTaskRunner: jest.fn(),
      },
    });

    pool.run.mockResolvedValue(Promise.resolve(TaskPoolRunResult.RunningAllClaimedTasks));

    return { poolCapacity, lifecycleEvent$, pool, elasticsearchAndSOAvailability$, opts };
  }

  describe('constructor', () => {
    test('avoids unnecesery subscription if ephemeral tasks are disabled', () => {
      const { opts } = initTaskLifecycleParams({
        config: {
          ephemeral_tasks: {
            enabled: false,
            request_capacity: 10,
          },
        },
      });

      const ephemeralTaskLifecycle = new EphemeralTaskLifecycle(opts);

      const task = taskManagerMock.createTask();
      expect(ephemeralTaskLifecycle.attemptToRun(task)).toMatchObject(asErr(task));
    });

    test('queues up tasks when ephemeral tasks are enabled', () => {
      const { opts } = initTaskLifecycleParams();

      const ephemeralTaskLifecycle = new EphemeralTaskLifecycle(opts);

      const task = taskManagerMock.createTask();
      expect(ephemeralTaskLifecycle.attemptToRun(task)).toMatchObject(asOk(task));
    });

    test('rejects tasks when ephemeral tasks are enabled and queue is full', () => {
      const { opts } = initTaskLifecycleParams({
        config: { ephemeral_tasks: { enabled: true, request_capacity: 2 } },
      });

      const ephemeralTaskLifecycle = new EphemeralTaskLifecycle(opts);

      const task = taskManagerMock.createTask();
      expect(ephemeralTaskLifecycle.attemptToRun(task)).toMatchObject(asOk(task));
      const task2 = taskManagerMock.createTask();
      expect(ephemeralTaskLifecycle.attemptToRun(task2)).toMatchObject(asOk(task2));

      const rejectedTask = taskManagerMock.createTask();
      expect(ephemeralTaskLifecycle.attemptToRun(rejectedTask)).toMatchObject(asErr(rejectedTask));
    });

    test('pulls tasks off queue when a polling cycle completes', () => {
      const { pool, poolCapacity, opts, lifecycleEvent$ } = initTaskLifecycleParams();

      const ephemeralTaskLifecycle = new EphemeralTaskLifecycle(opts);

      const task = taskManagerMock.createTask({ id: `my-phemeral-task` });
      expect(ephemeralTaskLifecycle.attemptToRun(task)).toMatchObject(asOk(task));

      poolCapacity.mockReturnValue({
        availableCapacity: 10,
      });

      lifecycleEvent$.next(
        asTaskPollingCycleEvent(asOk({ result: FillPoolResult.NoTasksClaimed }))
      );

      expect(pool.run).toHaveBeenCalledTimes(1);

      const taskRunners = pool.run.mock.calls[0][0];
      expect(taskRunners).toHaveLength(1);
      expect(`${taskRunners[0]}`).toMatchInlineSnapshot(`"foo \\"my-phemeral-task\\" (Ephemeral)"`);
    });

    test('pulls tasks off queue when a task run completes', () => {
      const { pool, poolCapacity, opts, lifecycleEvent$ } = initTaskLifecycleParams();

      const ephemeralTaskLifecycle = new EphemeralTaskLifecycle(opts);

      const task = taskManagerMock.createTask({ id: `my-phemeral-task` });
      expect(ephemeralTaskLifecycle.attemptToRun(task)).toMatchObject(asOk(task));

      poolCapacity.mockReturnValue({
        availableCapacity: 10,
      });

      lifecycleEvent$.next(
        asTaskRunEvent(
          uuidv4(),
          asOk({
            task: taskManagerMock.createTask(),
            result: TaskRunResult.Success,
            persistence: TaskPersistence.Ephemeral,
            isExpired: false,
          })
        )
      );

      expect(pool.run).toHaveBeenCalledTimes(1);

      const taskRunners = pool.run.mock.calls[0][0];
      expect(taskRunners).toHaveLength(1);
      expect(`${taskRunners[0]}`).toMatchInlineSnapshot(`"foo \\"my-phemeral-task\\" (Ephemeral)"`);
    });

    test('pulls as many tasks off queue as it has capacity for', () => {
      const { pool, poolCapacity, opts, lifecycleEvent$ } = initTaskLifecycleParams();

      const ephemeralTaskLifecycle = new EphemeralTaskLifecycle(opts);

      const tasks = [
        taskManagerMock.createTask(),
        taskManagerMock.createTask(),
        taskManagerMock.createTask(),
      ];
      expect(ephemeralTaskLifecycle.attemptToRun(tasks[0])).toMatchObject(asOk(tasks[0]));
      expect(ephemeralTaskLifecycle.attemptToRun(tasks[1])).toMatchObject(asOk(tasks[1]));
      expect(ephemeralTaskLifecycle.attemptToRun(tasks[2])).toMatchObject(asOk(tasks[2]));

      poolCapacity.mockReturnValue({
        availableCapacity: 2,
      });

      lifecycleEvent$.next(
        asTaskPollingCycleEvent(asOk({ result: FillPoolResult.NoTasksClaimed }))
      );

      expect(pool.run).toHaveBeenCalledTimes(1);

      const taskRunners = pool.run.mock.calls[0][0];
      expect(taskRunners).toHaveLength(2);
      expect(`${taskRunners[0]}`).toEqual(`foo "${tasks[0].id}" (Ephemeral)`);
      expect(`${taskRunners[1]}`).toEqual(`foo "${tasks[1].id}" (Ephemeral)`);
    });

    test('pulls only as many tasks of the same type as is allowed by maxConcurrency', () => {
      const { pool, poolCapacity, opts, lifecycleEvent$ } = initTaskLifecycleParams();

      opts.definitions.registerTaskDefinitions({
        report: {
          title: 'report',
          maxConcurrency: 1,
          createTaskRunner: jest.fn(),
        },
      });

      const ephemeralTaskLifecycle = new EphemeralTaskLifecycle(opts);

      const firstLimitedTask = taskManagerMock.createTask({ taskType: 'report' });
      const secondLimitedTask = taskManagerMock.createTask({ taskType: 'report' });
      // both are queued
      expect(ephemeralTaskLifecycle.attemptToRun(firstLimitedTask)).toMatchObject(
        asOk(firstLimitedTask)
      );
      expect(ephemeralTaskLifecycle.attemptToRun(secondLimitedTask)).toMatchObject(
        asOk(secondLimitedTask)
      );

      // pool has capacity for both
      poolCapacity.mockReturnValue({
        availableCapacity: 10,
      });
      pool.getUsedCapacityByType.mockReturnValue(0);

      lifecycleEvent$.next(
        asTaskPollingCycleEvent(asOk({ result: FillPoolResult.NoTasksClaimed }))
      );

      expect(pool.run).toHaveBeenCalledTimes(1);

      const taskRunners = pool.run.mock.calls[0][0];
      expect(taskRunners).toHaveLength(1);
      expect(`${taskRunners[0]}`).toEqual(`report "${firstLimitedTask.id}" (Ephemeral)`);
    });

    test('when pulling tasks from the queue, it takes into account the maxConcurrency of tasks that are already in the pool', () => {
      const { pool, poolCapacity, opts, lifecycleEvent$ } = initTaskLifecycleParams();

      opts.definitions.registerTaskDefinitions({
        report: {
          title: 'report',
          maxConcurrency: 1,
          createTaskRunner: jest.fn(),
        },
      });

      const ephemeralTaskLifecycle = new EphemeralTaskLifecycle(opts);

      const firstLimitedTask = taskManagerMock.createTask({ taskType: 'report' });
      const secondLimitedTask = taskManagerMock.createTask({ taskType: 'report' });
      // both are queued
      expect(ephemeralTaskLifecycle.attemptToRun(firstLimitedTask)).toMatchObject(
        asOk(firstLimitedTask)
      );
      expect(ephemeralTaskLifecycle.attemptToRun(secondLimitedTask)).toMatchObject(
        asOk(secondLimitedTask)
      );

      // pool has capacity in general
      poolCapacity.mockReturnValue({
        availableCapacity: 2,
      });
      // but when we ask how many it has occupied by type  - wee always have one worker already occupied by that type
      pool.getUsedCapacityByType.mockReturnValue(1);

      lifecycleEvent$.next(
        asTaskPollingCycleEvent(asOk({ result: FillPoolResult.NoTasksClaimed }))
      );

      expect(pool.run).toHaveBeenCalledTimes(0);

      // now we release the worker in the pool and cause another cycle in the epheemral queue
      pool.getUsedCapacityByType.mockReturnValue(0);
      lifecycleEvent$.next(
        asTaskPollingCycleEvent(asOk({ result: FillPoolResult.NoTasksClaimed }))
      );

      expect(pool.run).toHaveBeenCalledTimes(1);
      const taskRunners = pool.run.mock.calls[0][0];
      expect(taskRunners).toHaveLength(1);
      expect(`${taskRunners[0]}`).toEqual(`report "${firstLimitedTask.id}" (Ephemeral)`);
    });
  });

  test('pulls tasks with both maxConcurrency and unlimited concurrency', () => {
    const { pool, poolCapacity, opts, lifecycleEvent$ } = initTaskLifecycleParams();

    opts.definitions.registerTaskDefinitions({
      report: {
        title: 'report',
        maxConcurrency: 1,
        createTaskRunner: jest.fn(),
      },
    });

    const ephemeralTaskLifecycle = new EphemeralTaskLifecycle(opts);

    const fooTasks = [
      taskManagerMock.createTask(),
      taskManagerMock.createTask(),
      taskManagerMock.createTask(),
    ];
    expect(ephemeralTaskLifecycle.attemptToRun(fooTasks[0])).toMatchObject(asOk(fooTasks[0]));

    const firstLimitedTask = taskManagerMock.createTask({ taskType: 'report' });
    expect(ephemeralTaskLifecycle.attemptToRun(firstLimitedTask)).toMatchObject(
      asOk(firstLimitedTask)
    );

    expect(ephemeralTaskLifecycle.attemptToRun(fooTasks[1])).toMatchObject(asOk(fooTasks[1]));

    const secondLimitedTask = taskManagerMock.createTask({ taskType: 'report' });
    expect(ephemeralTaskLifecycle.attemptToRun(secondLimitedTask)).toMatchObject(
      asOk(secondLimitedTask)
    );

    expect(ephemeralTaskLifecycle.attemptToRun(fooTasks[2])).toMatchObject(asOk(fooTasks[2]));

    // pool has capacity for all
    poolCapacity.mockReturnValue({
      availableCapacity: 10,
    });
    pool.getUsedCapacityByType.mockReturnValue(0);

    lifecycleEvent$.next(asTaskPollingCycleEvent(asOk({ result: FillPoolResult.NoTasksClaimed })));

    expect(pool.run).toHaveBeenCalledTimes(1);

    const taskRunners = pool.run.mock.calls[0][0];
    expect(taskRunners).toHaveLength(4);
    const asStrings = taskRunners.map((taskRunner) => `${taskRunner}`);
    expect(asStrings).toContain(`foo "${fooTasks[0].id}" (Ephemeral)`);
    expect(asStrings).toContain(`report "${firstLimitedTask.id}" (Ephemeral)`);
    expect(asStrings).toContain(`foo "${fooTasks[1].id}" (Ephemeral)`);
    expect(asStrings).toContain(`foo "${fooTasks[2].id}" (Ephemeral)`);
  });

  test('properly removes from the queue after pulled', () => {
    const { poolCapacity, opts, lifecycleEvent$ } = initTaskLifecycleParams();

    const ephemeralTaskLifecycle = new EphemeralTaskLifecycle(opts);

    const tasks = [
      taskManagerMock.createTask(),
      taskManagerMock.createTask(),
      taskManagerMock.createTask(),
    ];
    expect(ephemeralTaskLifecycle.attemptToRun(tasks[0])).toMatchObject(asOk(tasks[0]));
    expect(ephemeralTaskLifecycle.attemptToRun(tasks[1])).toMatchObject(asOk(tasks[1]));
    expect(ephemeralTaskLifecycle.attemptToRun(tasks[2])).toMatchObject(asOk(tasks[2]));

    expect(ephemeralTaskLifecycle.queuedTasks).toBe(3);
    poolCapacity.mockReturnValue({
      availableCapacity: 1,
    });
    lifecycleEvent$.next(asTaskPollingCycleEvent(asOk({ result: FillPoolResult.NoTasksClaimed })));
    expect(ephemeralTaskLifecycle.queuedTasks).toBe(2);

    poolCapacity.mockReturnValue({
      availableCapacity: 1,
    });
    lifecycleEvent$.next(asTaskPollingCycleEvent(asOk({ result: FillPoolResult.NoTasksClaimed })));
    expect(ephemeralTaskLifecycle.queuedTasks).toBe(1);

    poolCapacity.mockReturnValue({
      availableCapacity: 1,
    });
    lifecycleEvent$.next(asTaskPollingCycleEvent(asOk({ result: FillPoolResult.NoTasksClaimed })));
    expect(ephemeralTaskLifecycle.queuedTasks).toBe(0);
  });
});
