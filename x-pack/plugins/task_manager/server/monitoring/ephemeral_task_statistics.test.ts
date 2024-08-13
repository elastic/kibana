/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { Subject, Observable } from 'rxjs';
import stats from 'stats-lite';
import { take, bufferCount, skip, map } from 'rxjs';

import { ConcreteTaskInstance, TaskStatus } from '../task';
import {
  asTaskRunEvent,
  TaskTiming,
  asTaskManagerStatEvent,
  TaskPersistence,
} from '../task_events';
import { asOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { TaskRunResult } from '../task_running';
import {
  createEphemeralTaskAggregator,
  summarizeEphemeralStat,
  SummarizedEphemeralTaskStat,
  EphemeralTaskStat,
} from './ephemeral_task_statistics';
import { AggregatedStat } from '../lib/runtime_statistics_aggregator';
import { ephemeralTaskLifecycleMock } from '../ephemeral_task_lifecycle.mock';
import { times, takeRight, take as takeLeft } from 'lodash';

describe('Ephemeral Task Statistics', () => {
  test('returns the average size of the ephemeral queue', async () => {
    const queueSize = [2, 6, 10, 10, 10, 6, 2, 0, 0];
    const events$ = new Subject<TaskLifecycleEvent>();
    const getQueuedTasks = jest.fn();
    const ephemeralTaskLifecycle = ephemeralTaskLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
      getQueuedTasks,
    });

    const runningAverageWindowSize = 5;
    const ephemeralTaskAggregator = createEphemeralTaskAggregator(
      ephemeralTaskLifecycle,
      runningAverageWindowSize,
      10
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedEphemeralTaskStat>,
      window: number[]
    ) {
      expect(taskStat.value.queuedTasks).toMatchObject({
        p50: stats.percentile(window, 0.5),
        p90: stats.percentile(window, 0.9),
        p95: stats.percentile(window, 0.95),
        p99: stats.percentile(window, 0.99),
      });
    }

    return new Promise<void>((resolve) => {
      ephemeralTaskAggregator
        .pipe(
          // skip initial stat which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          // Use 'summarizeEphemeralStat' to receive summarize stats
          map(({ key, value }: AggregatedStat<EphemeralTaskStat>) => ({
            key,
            value: summarizeEphemeralStat(value).value,
          })),
          take(queueSize.length),
          bufferCount(queueSize.length)
        )
        .subscribe((taskStats: Array<AggregatedStat<SummarizedEphemeralTaskStat>>) => {
          expectWindowEqualsUpdate(taskStats[0], queueSize.slice(0, 1));
          expectWindowEqualsUpdate(taskStats[1], queueSize.slice(0, 2));
          expectWindowEqualsUpdate(taskStats[2], queueSize.slice(0, 3));
          expectWindowEqualsUpdate(taskStats[3], queueSize.slice(0, 4));
          expectWindowEqualsUpdate(taskStats[4], queueSize.slice(0, 5));
          // from the 6th value, begin to drop old values as out window is 5
          expectWindowEqualsUpdate(taskStats[5], queueSize.slice(1, 6));
          expectWindowEqualsUpdate(taskStats[6], queueSize.slice(2, 7));
          expectWindowEqualsUpdate(taskStats[7], queueSize.slice(3, 8));
          resolve();
        });

      for (const size of queueSize) {
        events$.next(asTaskManagerStatEvent('queuedEphemeralTasks', asOk(size)));
      }
    });
  });

  test('returns the average number of ephemeral tasks executed per polling cycle', async () => {
    const tasksQueueSize = [5, 2, 5, 0];
    const executionsPerCycle = [5, 0, 5];
    // we expect one event per "task queue size event", and we simmulate
    // tasks being drained after each one of theseevents, so we expect
    // the first cycle to show zero drained tasks
    const expectedTasksDrainedEvents = [0, ...executionsPerCycle];

    const events$ = new Subject<TaskLifecycleEvent>();
    const getQueuedTasks = jest.fn();
    const ephemeralTaskLifecycle = ephemeralTaskLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
      getQueuedTasks,
    });

    const runningAverageWindowSize = 5;
    const ephemeralTaskAggregator = createEphemeralTaskAggregator(
      ephemeralTaskLifecycle,
      runningAverageWindowSize,
      10
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedEphemeralTaskStat>,
      window: number[]
    ) {
      expect(taskStat.value.executionsPerCycle).toMatchObject({
        p50: stats.percentile(window, 0.5),
        p90: stats.percentile(window, 0.9),
        p95: stats.percentile(window, 0.95),
        p99: stats.percentile(window, 0.99),
      });
    }

    return new Promise<void>((resolve) => {
      ephemeralTaskAggregator
        .pipe(
          // skip initial stat which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          // Use 'summarizeEphemeralStat' to receive summarize stats
          map(({ key, value }: AggregatedStat<EphemeralTaskStat>) => ({
            key,
            value: summarizeEphemeralStat(value).value,
          })),
          take(tasksQueueSize.length),
          bufferCount(tasksQueueSize.length)
        )
        .subscribe((taskStats: Array<AggregatedStat<SummarizedEphemeralTaskStat>>) => {
          taskStats.forEach((taskStat, index) => {
            expectWindowEqualsUpdate(
              taskStat,
              takeRight(takeLeft(expectedTasksDrainedEvents, index + 1), runningAverageWindowSize)
            );
          });
          resolve();
        });

      for (const tasksDrainedInCycle of executionsPerCycle) {
        events$.next(
          asTaskManagerStatEvent('queuedEphemeralTasks', asOk(tasksQueueSize.shift() ?? 0))
        );
        times(tasksDrainedInCycle, () => {
          events$.next(mockTaskRunEvent());
        });
      }
      events$.next(
        asTaskManagerStatEvent('queuedEphemeralTasks', asOk(tasksQueueSize.shift() ?? 0))
      );
    });
  });

  test('returns the average load added per polling cycle cycle by ephemeral tasks', async () => {
    const tasksExecuted = [0, 5, 10, 10, 10, 5, 5, 0, 0, 0, 0, 0];
    const expectedLoad = [0, 50, 100, 100, 100, 50, 50, 0, 0, 0, 0, 0];

    const events$ = new Subject<TaskLifecycleEvent>();
    const getQueuedTasks = jest.fn();
    const ephemeralTaskLifecycle = ephemeralTaskLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
      getQueuedTasks,
    });

    const runningAverageWindowSize = 5;
    const capacity = 10;
    const ephemeralTaskAggregator = createEphemeralTaskAggregator(
      ephemeralTaskLifecycle,
      runningAverageWindowSize,
      capacity
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedEphemeralTaskStat>,
      window: number[]
    ) {
      expect(taskStat.value.load).toMatchObject({
        p50: stats.percentile(window, 0.5),
        p90: stats.percentile(window, 0.9),
        p95: stats.percentile(window, 0.95),
        p99: stats.percentile(window, 0.99),
      });
    }

    return new Promise<void>((resolve) => {
      ephemeralTaskAggregator
        .pipe(
          // skip initial stat which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          // Use 'summarizeEphemeralStat' to receive summarize stats
          map(({ key, value }: AggregatedStat<EphemeralTaskStat>) => ({
            key,
            value: summarizeEphemeralStat(value).value,
          })),
          take(tasksExecuted.length),
          bufferCount(tasksExecuted.length)
        )
        .subscribe((taskStats: Array<AggregatedStat<SummarizedEphemeralTaskStat>>) => {
          taskStats.forEach((taskStat, index) => {
            expectWindowEqualsUpdate(
              taskStat,
              takeRight(takeLeft(expectedLoad, index + 1), runningAverageWindowSize)
            );
          });
          resolve();
        });

      for (const tasksExecutedInCycle of tasksExecuted) {
        times(tasksExecutedInCycle, () => {
          events$.next(mockTaskRunEvent());
        });
        events$.next(asTaskManagerStatEvent('queuedEphemeralTasks', asOk(0)));
      }
    });
  });
});

test('returns the average load added per polling cycle cycle by ephemeral tasks when load exceeds capacity', async () => {
  const tasksExecuted = [0, 5, 10, 20, 15, 10, 5, 0, 0, 0, 0, 0];
  const expectedLoad = [0, 50, 100, 200, 150, 100, 50, 0, 0, 0, 0, 0];

  const events$ = new Subject<TaskLifecycleEvent>();
  const getQueuedTasks = jest.fn();
  const ephemeralTaskLifecycle = ephemeralTaskLifecycleMock.create({
    events$: events$ as Observable<TaskLifecycleEvent>,
    getQueuedTasks,
  });

  const runningAverageWindowSize = 5;
  const capacity = 10;
  const ephemeralTaskAggregator = createEphemeralTaskAggregator(
    ephemeralTaskLifecycle,
    runningAverageWindowSize,
    capacity
  );

  function expectWindowEqualsUpdate(
    taskStat: AggregatedStat<SummarizedEphemeralTaskStat>,
    window: number[]
  ) {
    expect(taskStat.value.load).toMatchObject({
      p50: stats.percentile(window, 0.5),
      p90: stats.percentile(window, 0.9),
      p95: stats.percentile(window, 0.95),
      p99: stats.percentile(window, 0.99),
    });
  }

  return new Promise<void>((resolve) => {
    ephemeralTaskAggregator
      .pipe(
        // skip initial stat which is just initialized data which
        // ensures we don't stall on combineLatest
        skip(1),
        // Use 'summarizeEphemeralStat' to receive summarize stats
        map(({ key, value }: AggregatedStat<EphemeralTaskStat>) => ({
          key,
          value: summarizeEphemeralStat(value).value,
        })),
        take(tasksExecuted.length),
        bufferCount(tasksExecuted.length)
      )
      .subscribe((taskStats: Array<AggregatedStat<SummarizedEphemeralTaskStat>>) => {
        taskStats.forEach((taskStat, index) => {
          expectWindowEqualsUpdate(
            taskStat,
            takeRight(takeLeft(expectedLoad, index + 1), runningAverageWindowSize)
          );
        });
        resolve();
      });

    for (const tasksExecutedInCycle of tasksExecuted) {
      times(tasksExecutedInCycle, () => {
        events$.next(mockTaskRunEvent());
      });
      events$.next(asTaskManagerStatEvent('queuedEphemeralTasks', asOk(0)));
    }
  });
});

test('returns the average delay experienced by tasks in the ephemeral queue', async () => {
  const taskDelays = [100, 150, 500, 100, 100, 200, 2000, 10000, 20000, 100];

  const events$ = new Subject<TaskLifecycleEvent>();
  const getQueuedTasks = jest.fn();
  const ephemeralTaskLifecycle = ephemeralTaskLifecycleMock.create({
    events$: events$ as Observable<TaskLifecycleEvent>,
    getQueuedTasks,
  });

  const runningAverageWindowSize = 5;
  const ephemeralTaskAggregator = createEphemeralTaskAggregator(
    ephemeralTaskLifecycle,
    runningAverageWindowSize,
    10
  );

  function expectWindowEqualsUpdate(
    taskStat: AggregatedStat<SummarizedEphemeralTaskStat>,
    window: number[]
  ) {
    expect(taskStat.value.delay).toMatchObject({
      p50: stats.percentile(window, 0.5),
      p90: stats.percentile(window, 0.9),
      p95: stats.percentile(window, 0.95),
      p99: stats.percentile(window, 0.99),
    });
  }

  return new Promise<void>((resolve) => {
    ephemeralTaskAggregator
      .pipe(
        // skip initial stat which is just initialized data which
        // ensures we don't stall on combineLatest
        skip(1),
        // Use 'summarizeEphemeralStat' to receive summarize stats
        map(({ key, value }: AggregatedStat<EphemeralTaskStat>) => ({
          key,
          value: summarizeEphemeralStat(value).value,
        })),
        take(taskDelays.length),
        bufferCount(taskDelays.length)
      )
      .subscribe((taskStats: Array<AggregatedStat<SummarizedEphemeralTaskStat>>) => {
        taskStats.forEach((taskStat, index) => {
          expectWindowEqualsUpdate(
            taskStat,
            takeRight(takeLeft(taskDelays, index + 1), runningAverageWindowSize)
          );
        });
        resolve();
      });

    for (const delay of taskDelays) {
      events$.next(asTaskManagerStatEvent('ephemeralTaskDelay', asOk(delay)));
    }
  });
});

const mockTaskRunEvent = (
  overrides: Partial<ConcreteTaskInstance> = {},
  timing: TaskTiming = {
    start: 0,
    stop: 0,
  },
  result: TaskRunResult = TaskRunResult.Success
) => {
  const task = mockTaskInstance(overrides);
  const persistence = TaskPersistence.Recurring;
  return asTaskRunEvent(task.id, asOk({ task, persistence, result, isExpired: false }), timing);
};

const mockTaskInstance = (overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance => ({
  id: uuidv4(),
  attempts: 0,
  status: TaskStatus.Running,
  version: '123',
  runAt: new Date(),
  scheduledAt: new Date(),
  startedAt: new Date(),
  retryAt: new Date(Date.now() + 5 * 60 * 1000),
  state: {},
  taskType: 'alerting:test',
  params: {
    alertId: '1',
  },
  ownerId: null,
  ...overrides,
});
