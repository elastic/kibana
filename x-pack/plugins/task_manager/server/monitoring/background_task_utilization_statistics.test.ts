/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { Subject, Observable } from 'rxjs';
import stats from 'stats-lite';
import { take, bufferCount, skip, map } from 'rxjs/operators';
import { ConcreteTaskInstance, TaskStatus } from '../task';
import { asTaskRunEvent, TaskTiming, TaskPersistence } from '../task_events';
import { asOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { TaskRunResult } from '../task_running';
import { AggregatedStat } from './runtime_statistics_aggregator';
import { taskPollingLifecycleMock } from '../polling_lifecycle.mock';
import {
  BackgroundTaskUtilizationStat,
  createBackgroundTaskUtilizationAggregator,
  SummarizedBackgroundTaskUtilizationStat,
  summarizeUtilizationStat,
} from './background_task_utilization_statistics';
import { parseIntervalAsMinute } from '../lib/intervals';
import { AdHocTaskCounter } from '../lib/adhoc_task_counter';
import { sum } from 'lodash';

describe('Task Run Statistics', () => {
  const pollInterval = 3000;

  beforeAll(() => {
    jest.resetAllMocks();
  });

  test('returns a running average of adhoc actual service_time', async () => {
    const serviceTimes = [1000, 2000, 500, 300, 400, 15000, 20000, 200];
    const events$ = new Subject<TaskLifecycleEvent>();
    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });
    const adHocTaskCounter = new AdHocTaskCounter();

    const runningAverageWindowSize = 5;
    const BackgroundTaskUtilizationAggregator = createBackgroundTaskUtilizationAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize,
      adHocTaskCounter,
      pollInterval
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedBackgroundTaskUtilizationStat>,
      window: number[]
    ) {
      expect(taskStat.value.adhoc.ran.service_time.actual).toMatchObject({
        p50: stats.percentile(window, 0.5),
        p90: stats.percentile(window, 0.9),
        p95: stats.percentile(window, 0.95),
        p99: stats.percentile(window, 0.99),
      });
    }

    return new Promise<void>((resolve) => {
      const events = [];
      const now = Date.now();
      for (const time of serviceTimes) {
        events.push({ start: runAtMillisecondsAgo(now, time).getTime(), stop: now });
      }
      BackgroundTaskUtilizationAggregator.pipe(
        // skip initial stat which is just initialized data which
        // ensures we don't stall on combineLatest
        skip(1),
        // Use 'summarizeUtilizationStat' to receive summarize stats
        map(({ key, value }: AggregatedStat<BackgroundTaskUtilizationStat>) => ({
          key,
          value: summarizeUtilizationStat(value).value,
        })),
        take(serviceTimes.length),
        bufferCount(serviceTimes.length)
      ).subscribe((taskStats: Array<AggregatedStat<SummarizedBackgroundTaskUtilizationStat>>) => {
        expectWindowEqualsUpdate(taskStats[0], serviceTimes.slice(0, 1));
        expectWindowEqualsUpdate(taskStats[1], serviceTimes.slice(0, 2));
        expectWindowEqualsUpdate(taskStats[2], serviceTimes.slice(0, 3));
        expectWindowEqualsUpdate(taskStats[3], serviceTimes.slice(0, 4));
        expectWindowEqualsUpdate(taskStats[4], serviceTimes.slice(0, 5));
        // from the 6th value, begin to drop old values as out window is 5
        expectWindowEqualsUpdate(taskStats[5], serviceTimes.slice(1, 6));
        expectWindowEqualsUpdate(taskStats[6], serviceTimes.slice(2, 7));
        expectWindowEqualsUpdate(taskStats[7], serviceTimes.slice(3, 8));
        resolve();
      });

      for (const event of events) {
        events$.next(mockTaskRunEvent({}, event));
      }
    });
  });

  test('returns a running average of adhoc adjusted service_time', async () => {
    const serviceTimes = [1000, 2000, 500, 300, 400, 15000, 20000, 200];
    const events$ = new Subject<TaskLifecycleEvent>();
    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });
    const adHocTaskCounter = new AdHocTaskCounter();

    const runningAverageWindowSize = 5;
    const BackgroundTaskUtilizationAggregator = createBackgroundTaskUtilizationAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize,
      adHocTaskCounter,
      pollInterval
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedBackgroundTaskUtilizationStat>,
      window: number[]
    ) {
      expect(taskStat.value.adhoc.ran.service_time.adjusted).toMatchObject({
        p50: stats.percentile(window, 0.5),
        p90: stats.percentile(window, 0.9),
        p95: stats.percentile(window, 0.95),
        p99: stats.percentile(window, 0.99),
      });
    }

    return new Promise<void>((resolve) => {
      const events = [];
      const now = Date.now();
      for (const time of serviceTimes) {
        events.push({ start: runAtMillisecondsAgo(now, time).getTime(), stop: now });
      }
      BackgroundTaskUtilizationAggregator.pipe(
        // skip initial stat which is just initialized data which
        // ensures we don't stall on combineLatest
        skip(1),
        // Use 'summarizeUtilizationStat' to receive summarize stats
        map(({ key, value }: AggregatedStat<BackgroundTaskUtilizationStat>) => ({
          key,
          value: summarizeUtilizationStat(value).value,
        })),
        take(serviceTimes.length),
        bufferCount(serviceTimes.length)
      ).subscribe((taskStats: Array<AggregatedStat<SummarizedBackgroundTaskUtilizationStat>>) => {
        expectWindowEqualsUpdate(taskStats[0], roundUpToNearestSec(serviceTimes.slice(0, 1), 3));
        expectWindowEqualsUpdate(taskStats[1], roundUpToNearestSec(serviceTimes.slice(0, 2), 3));
        expectWindowEqualsUpdate(taskStats[2], roundUpToNearestSec(serviceTimes.slice(0, 3), 3));
        expectWindowEqualsUpdate(taskStats[3], roundUpToNearestSec(serviceTimes.slice(0, 4), 3));
        expectWindowEqualsUpdate(taskStats[4], roundUpToNearestSec(serviceTimes.slice(0, 5), 3));
        // from the 6th value, begin to drop old values as out window is 5
        expectWindowEqualsUpdate(taskStats[5], roundUpToNearestSec(serviceTimes.slice(1, 6), 3));
        expectWindowEqualsUpdate(taskStats[6], roundUpToNearestSec(serviceTimes.slice(2, 7), 3));
        expectWindowEqualsUpdate(taskStats[7], roundUpToNearestSec(serviceTimes.slice(3, 8), 3));
        resolve();
      });

      for (const event of events) {
        events$.next(mockTaskRunEvent({}, event));
      }
    });
  });

  test('returns a running count of adhoc task_counter', async () => {
    const tasks = [0, 0, 0, 0, 0, 0, 0, 0];
    const events$ = new Subject<TaskLifecycleEvent>();
    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });
    const adHocTaskCounter = new AdHocTaskCounter();

    const runningAverageWindowSize = 5;
    const BackgroundTaskUtilizationAggregator = createBackgroundTaskUtilizationAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize,
      adHocTaskCounter,
      pollInterval
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedBackgroundTaskUtilizationStat>,
      window: number[]
    ) {
      expect(taskStat.value.adhoc.ran.service_time.task_counter).toEqual(window.length);
    }

    return new Promise<void>((resolve) => {
      BackgroundTaskUtilizationAggregator.pipe(
        // skip initial stat which is just initialized data which
        // ensures we don't stall on combineLatest
        skip(1),
        // Use 'summarizeUtilizationStat' to receive summarize stats
        map(({ key, value }: AggregatedStat<BackgroundTaskUtilizationStat>) => ({
          key,
          value: summarizeUtilizationStat(value).value,
        })),
        take(tasks.length),
        bufferCount(tasks.length)
      ).subscribe((taskStats: Array<AggregatedStat<SummarizedBackgroundTaskUtilizationStat>>) => {
        expectWindowEqualsUpdate(taskStats[0], tasks.slice(0, 1));
        expectWindowEqualsUpdate(taskStats[1], tasks.slice(0, 2));
        expectWindowEqualsUpdate(taskStats[2], tasks.slice(0, 3));
        expectWindowEqualsUpdate(taskStats[3], tasks.slice(0, 4));
        expectWindowEqualsUpdate(taskStats[4], tasks.slice(0, 5));
        // from the 6th value, begin to drop old values as out window is 5
        expectWindowEqualsUpdate(taskStats[5], tasks.slice(1, 6));
        expectWindowEqualsUpdate(taskStats[6], tasks.slice(2, 7));
        expectWindowEqualsUpdate(taskStats[7], tasks.slice(3, 8));
        resolve();
      });

      for (const task of tasks) {
        events$.next(mockTaskRunEvent({}, { start: task, stop: task }));
      }
    });
  });

  test('returns a running count of adhoc created counter', async () => {
    const tasks = [1000, 2000, 500, 300, 400, 15000, 20000, 200];
    const events$ = new Subject<TaskLifecycleEvent>();
    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });
    const adHocTaskCounter = new AdHocTaskCounter();

    const runningAverageWindowSize = 5;
    const BackgroundTaskUtilizationAggregator = createBackgroundTaskUtilizationAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize,
      adHocTaskCounter,
      pollInterval
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedBackgroundTaskUtilizationStat>,
      window: number[]
    ) {
      expect(taskStat.value.adhoc.created.counter).toEqual(sum(window));
    }

    return new Promise<void>((resolve) => {
      BackgroundTaskUtilizationAggregator.pipe(
        // skip initial stat which is just initialized data which
        // ensures we don't stall on combineLatest
        skip(1),
        // Use 'summarizeUtilizationStat' to receive summarize stats
        map(({ key, value }: AggregatedStat<BackgroundTaskUtilizationStat>) => ({
          key,
          value: summarizeUtilizationStat(value).value,
        })),
        take(tasks.length),
        bufferCount(tasks.length)
      ).subscribe((taskStats: Array<AggregatedStat<SummarizedBackgroundTaskUtilizationStat>>) => {
        expectWindowEqualsUpdate(taskStats[0], tasks.slice(0, 1));
        expectWindowEqualsUpdate(taskStats[1], tasks.slice(0, 2));
        expectWindowEqualsUpdate(taskStats[2], tasks.slice(0, 3));
        expectWindowEqualsUpdate(taskStats[3], tasks.slice(0, 4));
        expectWindowEqualsUpdate(taskStats[4], tasks.slice(0, 5));
        // from the 6th value, begin to drop old values as out window is 5
        expectWindowEqualsUpdate(taskStats[5], tasks.slice(1, 6));
        expectWindowEqualsUpdate(taskStats[6], tasks.slice(2, 7));
        expectWindowEqualsUpdate(taskStats[7], tasks.slice(3, 8));
        resolve();
      });

      for (const task of tasks) {
        adHocTaskCounter.increment(task);
        events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }));
      }
    });
  });

  test('returns a running average of recurring actual service_time', async () => {
    const serviceTimes = [1000, 2000, 500, 300, 400, 15000, 20000, 200];
    const events$ = new Subject<TaskLifecycleEvent>();
    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });
    const adHocTaskCounter = new AdHocTaskCounter();

    const runningAverageWindowSize = 5;
    const BackgroundTaskUtilizationAggregator = createBackgroundTaskUtilizationAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize,
      adHocTaskCounter,
      pollInterval
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedBackgroundTaskUtilizationStat>,
      window: number[]
    ) {
      expect(taskStat.value.recurring.ran.service_time.actual).toMatchObject({
        p50: stats.percentile(window, 0.5),
        p90: stats.percentile(window, 0.9),
        p95: stats.percentile(window, 0.95),
        p99: stats.percentile(window, 0.99),
      });
    }

    return new Promise<void>((resolve) => {
      const events = [];
      const now = Date.now();
      for (const time of serviceTimes) {
        events.push({ start: runAtMillisecondsAgo(now, time).getTime(), stop: now });
      }
      BackgroundTaskUtilizationAggregator.pipe(
        // skip initial stat which is just initialized data which
        // ensures we don't stall on combineLatest
        skip(1),
        // Use 'summarizeUtilizationStat' to receive summarize stats
        map(({ key, value }: AggregatedStat<BackgroundTaskUtilizationStat>) => ({
          key,
          value: summarizeUtilizationStat(value).value,
        })),
        take(serviceTimes.length),
        bufferCount(serviceTimes.length)
      ).subscribe((taskStats: Array<AggregatedStat<SummarizedBackgroundTaskUtilizationStat>>) => {
        expectWindowEqualsUpdate(taskStats[0], serviceTimes.slice(0, 1));
        expectWindowEqualsUpdate(taskStats[1], serviceTimes.slice(0, 2));
        expectWindowEqualsUpdate(taskStats[2], serviceTimes.slice(0, 3));
        expectWindowEqualsUpdate(taskStats[3], serviceTimes.slice(0, 4));
        expectWindowEqualsUpdate(taskStats[4], serviceTimes.slice(0, 5));
        // from the 6th value, begin to drop old values as out window is 5
        expectWindowEqualsUpdate(taskStats[5], serviceTimes.slice(1, 6));
        expectWindowEqualsUpdate(taskStats[6], serviceTimes.slice(2, 7));
        expectWindowEqualsUpdate(taskStats[7], serviceTimes.slice(3, 8));
        resolve();
      });

      for (const event of events) {
        events$.next(mockTaskRunEvent({ schedule: { interval: '1h' } }, event));
      }
    });
  });

  test('returns a running average of recurring adjusted service_time', async () => {
    const serviceTimes = [1000, 2000, 500, 300, 400, 15000, 20000, 200];
    const events$ = new Subject<TaskLifecycleEvent>();
    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });
    const adHocTaskCounter = new AdHocTaskCounter();

    const runningAverageWindowSize = 5;
    const BackgroundTaskUtilizationAggregator = createBackgroundTaskUtilizationAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize,
      adHocTaskCounter,
      pollInterval
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedBackgroundTaskUtilizationStat>,
      window: number[]
    ) {
      expect(taskStat.value.recurring.ran.service_time.adjusted).toMatchObject({
        p50: stats.percentile(window, 0.5),
        p90: stats.percentile(window, 0.9),
        p95: stats.percentile(window, 0.95),
        p99: stats.percentile(window, 0.99),
      });
    }

    return new Promise<void>((resolve) => {
      const events = [];
      const now = Date.now();
      for (const time of serviceTimes) {
        events.push({ start: runAtMillisecondsAgo(now, time).getTime(), stop: now });
      }
      BackgroundTaskUtilizationAggregator.pipe(
        // skip initial stat which is just initialized data which
        // ensures we don't stall on combineLatest
        skip(1),
        // Use 'summarizeUtilizationStat' to receive summarize stats
        map(({ key, value }: AggregatedStat<BackgroundTaskUtilizationStat>) => ({
          key,
          value: summarizeUtilizationStat(value).value,
        })),
        take(serviceTimes.length),
        bufferCount(serviceTimes.length)
      ).subscribe((taskStats: Array<AggregatedStat<SummarizedBackgroundTaskUtilizationStat>>) => {
        expectWindowEqualsUpdate(taskStats[0], roundUpToNearestSec(serviceTimes.slice(0, 1), 3));
        expectWindowEqualsUpdate(taskStats[1], roundUpToNearestSec(serviceTimes.slice(0, 2), 3));
        expectWindowEqualsUpdate(taskStats[2], roundUpToNearestSec(serviceTimes.slice(0, 3), 3));
        expectWindowEqualsUpdate(taskStats[3], roundUpToNearestSec(serviceTimes.slice(0, 4), 3));
        expectWindowEqualsUpdate(taskStats[4], roundUpToNearestSec(serviceTimes.slice(0, 5), 3));
        // from the 6th value, begin to drop old values as out window is 5
        expectWindowEqualsUpdate(taskStats[5], roundUpToNearestSec(serviceTimes.slice(1, 6), 3));
        expectWindowEqualsUpdate(taskStats[6], roundUpToNearestSec(serviceTimes.slice(2, 7), 3));
        expectWindowEqualsUpdate(taskStats[7], roundUpToNearestSec(serviceTimes.slice(3, 8), 3));
        resolve();
      });

      for (const event of events) {
        events$.next(mockTaskRunEvent({ schedule: { interval: '1h' } }, event));
      }
    });
  });

  test('returns a running count of recurring task_counter', async () => {
    const tasks = [0, 0, 0, 0, 0, 0, 0, 0];
    const events$ = new Subject<TaskLifecycleEvent>();
    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });
    const adHocTaskCounter = new AdHocTaskCounter();

    const runningAverageWindowSize = 5;
    const BackgroundTaskUtilizationAggregator = createBackgroundTaskUtilizationAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize,
      adHocTaskCounter,
      pollInterval
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedBackgroundTaskUtilizationStat>,
      window: number[]
    ) {
      expect(taskStat.value.recurring.ran.service_time.task_counter).toEqual(window.length);
    }

    return new Promise<void>((resolve) => {
      BackgroundTaskUtilizationAggregator.pipe(
        // skip initial stat which is just initialized data which
        // ensures we don't stall on combineLatest
        skip(1),
        // Use 'summarizeUtilizationStat' to receive summarize stats
        map(({ key, value }: AggregatedStat<BackgroundTaskUtilizationStat>) => ({
          key,
          value: summarizeUtilizationStat(value).value,
        })),
        take(tasks.length),
        bufferCount(tasks.length)
      ).subscribe((taskStats: Array<AggregatedStat<SummarizedBackgroundTaskUtilizationStat>>) => {
        expectWindowEqualsUpdate(taskStats[0], tasks.slice(0, 1));
        expectWindowEqualsUpdate(taskStats[1], tasks.slice(0, 2));
        expectWindowEqualsUpdate(taskStats[2], tasks.slice(0, 3));
        expectWindowEqualsUpdate(taskStats[3], tasks.slice(0, 4));
        expectWindowEqualsUpdate(taskStats[4], tasks.slice(0, 5));
        // from the 6th value, begin to drop old values as out window is 5
        expectWindowEqualsUpdate(taskStats[5], tasks.slice(1, 6));
        expectWindowEqualsUpdate(taskStats[6], tasks.slice(2, 7));
        expectWindowEqualsUpdate(taskStats[7], tasks.slice(3, 8));
        resolve();
      });

      for (const task of tasks) {
        events$.next(
          mockTaskRunEvent({ schedule: { interval: '1h' } }, { start: task, stop: task })
        );
      }
    });
  });

  test('returns a running average of recurring tasks_per_min', async () => {
    const intervals = ['1h', '5m', '2h', '30m', '10m', '1m', '5h', '120m'];
    const events$ = new Subject<TaskLifecycleEvent>();
    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });
    const adHocTaskCounter = new AdHocTaskCounter();

    const runningAverageWindowSize = 5;
    const BackgroundTaskUtilizationAggregator = createBackgroundTaskUtilizationAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize,
      adHocTaskCounter,
      pollInterval
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedBackgroundTaskUtilizationStat>,
      window: number[]
    ) {
      expect(taskStat.value.recurring.tasks_per_min).toMatchObject({
        p50: stats.percentile(window, 0.5),
        p90: stats.percentile(window, 0.9),
        p95: stats.percentile(window, 0.95),
        p99: stats.percentile(window, 0.99),
      });
    }

    return new Promise<void>((resolve) => {
      BackgroundTaskUtilizationAggregator.pipe(
        // skip initial stat which is just initialized data which
        // ensures we don't stall on combineLatest
        skip(1),
        // Use 'summarizeUtilizationStat' to receive summarize stats
        map(({ key, value }: AggregatedStat<BackgroundTaskUtilizationStat>) => ({
          key,
          value: summarizeUtilizationStat(value).value,
        })),
        take(intervals.length),
        bufferCount(intervals.length)
      ).subscribe((taskStats: Array<AggregatedStat<SummarizedBackgroundTaskUtilizationStat>>) => {
        expectWindowEqualsUpdate(taskStats[0], mapInterval(intervals.slice(0, 1)));
        expectWindowEqualsUpdate(taskStats[1], mapInterval(intervals.slice(0, 2)));
        expectWindowEqualsUpdate(taskStats[2], mapInterval(intervals.slice(0, 3)));
        expectWindowEqualsUpdate(taskStats[3], mapInterval(intervals.slice(0, 4)));
        expectWindowEqualsUpdate(taskStats[4], mapInterval(intervals.slice(0, 5)));
        // from the 6th value, begin to drop old values as out window is 5
        expectWindowEqualsUpdate(taskStats[5], mapInterval(intervals.slice(1, 6)));
        expectWindowEqualsUpdate(taskStats[6], mapInterval(intervals.slice(2, 7)));
        expectWindowEqualsUpdate(taskStats[7], mapInterval(intervals.slice(3, 8)));
        resolve();
      });

      for (const i of intervals) {
        events$.next(mockTaskRunEvent({ schedule: { interval: i } }, { start: 0, stop: 0 }));
      }
    });
  });
});

function runAtMillisecondsAgo(now: number, ms: number): Date {
  return new Date(now - ms);
}

function roundUpToNearestSec(duration: number[], s: number): number[] {
  const pollInterval = s * 1000;
  return duration.map((d) => Math.ceil(d / pollInterval) * pollInterval);
}

function mapInterval(intervals: string[]): number[] {
  return intervals.map((i) => {
    const interval = parseIntervalAsMinute(i);
    return 1 / interval;
  });
}

const mockTaskRunEvent = (
  overrides: Partial<ConcreteTaskInstance> = {},
  timing: TaskTiming,
  result: TaskRunResult = TaskRunResult.Success,
  persistence?: TaskPersistence
) => {
  const task = mockTaskInstance(overrides);
  return asTaskRunEvent(
    task.id,
    asOk({
      task,
      persistence:
        persistence ?? (task.schedule ? TaskPersistence.Recurring : TaskPersistence.NonRecurring),
      result,
    }),
    timing
  );
};

const mockTaskInstance = (overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance => ({
  id: uuid.v4(),
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
