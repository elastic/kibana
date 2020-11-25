/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { Subject, Observable } from 'rxjs';
import stats from 'stats-lite';
import sinon from 'sinon';
import { take, tap, bufferCount, skip, map } from 'rxjs/operators';

import { ConcreteTaskInstance, TaskStatus } from '../task';
import { asTaskRunEvent, asTaskPollingCycleEvent, TaskTiming } from '../task_events';
import { asOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { TaskRunResult } from '../task_running';
import {
  createTaskRunAggregator,
  summarizeTaskRunStat,
  TaskRunStat,
  SummarizedTaskRunStat,
} from './task_run_statistics';
import { AggregatedStat } from './runtime_statistics_aggregator';
import { FillPoolResult } from '../lib/fill_pool';
import { taskPollingLifecycleMock } from '../polling_lifecycle.mock';
import { configSchema } from '../config';

describe('Task Run Statistics', () => {
  let fakeTimer: sinon.SinonFakeTimers;

  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
  });

  afterAll(() => fakeTimer.restore());

  test('returns a running average of task drift', async () => {
    const runAtDrift = [1000, 2000, 500, 300, 400, 15000, 20000, 200];
    const events$ = new Subject<TaskLifecycleEvent>();
    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });

    const runningAverageWindowSize = 5;
    const taskRunAggregator = createTaskRunAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedTaskRunStat>,
      window: number[]
    ) {
      expect(taskStat.value.drift).toMatchObject({
        p50: stats.percentile(window, 0.5),
        p90: stats.percentile(window, 0.9),
        p95: stats.percentile(window, 0.95),
        p99: stats.percentile(window, 0.99),
      });
    }

    return new Promise((resolve) => {
      taskRunAggregator
        .pipe(
          // skip initial stat which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          // Use 'summarizeTaskRunStat' to receive summarize stats
          map(({ key, value }: AggregatedStat<TaskRunStat>) => ({
            key,
            value: summarizeTaskRunStat(value, getTaskManagerConfig()).value,
          })),
          take(runAtDrift.length),
          bufferCount(runAtDrift.length)
        )
        .subscribe((taskStats: Array<AggregatedStat<SummarizedTaskRunStat>>) => {
          expectWindowEqualsUpdate(taskStats[0], runAtDrift.slice(0, 1));
          expectWindowEqualsUpdate(taskStats[1], runAtDrift.slice(0, 2));
          expectWindowEqualsUpdate(taskStats[2], runAtDrift.slice(0, 3));
          expectWindowEqualsUpdate(taskStats[3], runAtDrift.slice(0, 4));
          expectWindowEqualsUpdate(taskStats[4], runAtDrift.slice(0, 5));
          // from the 6th value, begin to drop old values as out window is 5
          expectWindowEqualsUpdate(taskStats[5], runAtDrift.slice(1, 6));
          expectWindowEqualsUpdate(taskStats[6], runAtDrift.slice(2, 7));
          expectWindowEqualsUpdate(taskStats[7], runAtDrift.slice(3, 8));
          resolve();
        });

      const now = Date.now();
      for (const drift of runAtDrift) {
        const start = Math.floor(Math.random() * 1000);
        events$.next(
          mockTaskRunEvent(
            { runAt: runAtMillisecondsAgo(drift + start) },
            { start: runAtMillisecondsAgo(start).getTime(), stop: now }
          )
        );
      }
    });
  });

  test('returns a running average of task run duration', async () => {
    const runDurations = [1000, 2000, 500, 300, 400, 15000, 20000, 200];
    const runDurationsInReverse = runDurations.reverse();
    const events$ = new Subject<TaskLifecycleEvent>();
    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });

    const runningAverageWindowSize = 5;
    const taskRunAggregator = createTaskRunAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedTaskRunStat>,
      windows: Record<string, number[]>
    ) {
      for (const [type, window] of Object.entries(windows)) {
        expect(taskStat.value.execution.duration[type]).toMatchObject({
          p50: stats.percentile(window, 0.5),
          p90: stats.percentile(window, 0.9),
          p95: stats.percentile(window, 0.95),
          p99: stats.percentile(window, 0.99),
        });
      }
    }

    return new Promise((resolve, reject) => {
      taskRunAggregator
        .pipe(
          // skip initial stat which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          // Use 'summarizeTaskRunStat' to receive summarize stats
          map(({ key, value }: AggregatedStat<TaskRunStat>) => ({
            key,
            value: summarizeTaskRunStat(value, getTaskManagerConfig()).value,
          })),
          take(runDurations.length * 2),
          bufferCount(runDurations.length * 2)
        )
        .subscribe((taskStats: Array<AggregatedStat<SummarizedTaskRunStat>>) => {
          try {
            expectWindowEqualsUpdate(taskStats[0], { 'alerting:test': runDurations.slice(0, 1) });
            expectWindowEqualsUpdate(taskStats[1], { 'alerting:test': runDurations.slice(0, 2) });
            expectWindowEqualsUpdate(taskStats[2], { 'alerting:test': runDurations.slice(0, 3) });
            expectWindowEqualsUpdate(taskStats[3], { 'alerting:test': runDurations.slice(0, 4) });
            expectWindowEqualsUpdate(taskStats[4], { 'alerting:test': runDurations.slice(0, 5) });
            // from the 6th value, begin to drop old values as out window is 5
            expectWindowEqualsUpdate(taskStats[5], { 'alerting:test': runDurations.slice(1, 6) });
            expectWindowEqualsUpdate(taskStats[6], { 'alerting:test': runDurations.slice(2, 7) });
            expectWindowEqualsUpdate(taskStats[7], { 'alerting:test': runDurations.slice(3, 8) });
            expectWindowEqualsUpdate(taskStats[8], {
              'actions:test': runDurations.slice(0, 1),
              'alerting:test': runDurations.slice(3, 8),
            });
            expectWindowEqualsUpdate(taskStats[9], {
              'actions:test': runDurations.slice(0, 2),
              'alerting:test': runDurations.slice(3, 8),
            });
            expectWindowEqualsUpdate(taskStats[10], {
              'actions:test': runDurations.slice(0, 3),
              'alerting:test': runDurations.slice(3, 8),
            });
            expectWindowEqualsUpdate(taskStats[11], {
              'actions:test': runDurations.slice(0, 4),
              'alerting:test': runDurations.slice(3, 8),
            });
            expectWindowEqualsUpdate(taskStats[12], {
              'actions:test': runDurations.slice(0, 5),
              'alerting:test': runDurations.slice(3, 8),
            });
            // from the 6th value, begin to drop old values as out window is 5
            expectWindowEqualsUpdate(taskStats[13], {
              'actions:test': runDurations.slice(1, 6),
              'alerting:test': runDurations.slice(3, 8),
            });
            expectWindowEqualsUpdate(taskStats[14], {
              'actions:test': runDurations.slice(2, 7),
              'alerting:test': runDurations.slice(3, 8),
            });
            expectWindowEqualsUpdate(taskStats[15], {
              'actions:test': runDurations.slice(3, 8),
              'alerting:test': runDurations.slice(3, 8),
            });
            resolve();
          } catch (e) {
            reject(e);
          }
        });

      const now = Date.now();
      for (const runDuration of runDurations) {
        events$.next(
          mockTaskRunEvent(
            { taskType: 'alerting:test' },
            { start: runAtMillisecondsAgo(runDuration).getTime(), stop: now }
          )
        );
      }
      for (const runDuration of runDurationsInReverse) {
        events$.next(
          mockTaskRunEvent(
            { taskType: 'actions:test' },
            { start: runAtMillisecondsAgo(runDuration).getTime(), stop: now }
          )
        );
      }
    });
  });

  test('returns the frequency of task run results', async () => {
    const events$ = new Subject<TaskLifecycleEvent>();
    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });

    const runningAverageWindowSize = 5;
    const taskRunAggregator = createTaskRunAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize
    );

    return new Promise((resolve, reject) => {
      taskRunAggregator
        .pipe(
          // skip initial stat which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          // Use 'summarizeTaskRunStat' to receive summarize stats
          map(({ key, value }: AggregatedStat<TaskRunStat>) => ({
            key,
            value: summarizeTaskRunStat(value, getTaskManagerConfig()).value,
          })),
          take(10),
          bufferCount(10)
        )
        .subscribe((taskStats: Array<AggregatedStat<SummarizedTaskRunStat>>) => {
          try {
            /**
             * At any given time we only keep track of the last X Polling Results
             * In the tests this is ocnfiugured to a window size of 5
             */
            expect(
              taskStats.map(
                (taskStat) =>
                  taskStat.value.execution.result_frequency_percent_as_number['alerting:test']
              )
            ).toEqual([
              // Success
              { Success: 100, RetryScheduled: 0, Failed: 0, status: 'OK' },
              // Success, Success,
              { Success: 100, RetryScheduled: 0, Failed: 0, status: 'OK' },
              // Success, Success, Success
              { Success: 100, RetryScheduled: 0, Failed: 0, status: 'OK' },
              // Success, Success, Success, Failed
              { Success: 75, RetryScheduled: 0, Failed: 25, status: 'OK' },
              // Success, Success, Success, Failed, Failed
              { Success: 60, RetryScheduled: 0, Failed: 40, status: 'OK' },
              // Success, Success, Failed, Failed, Failed
              { Success: 40, RetryScheduled: 0, Failed: 60, status: 'OK' },
              // Success, Failed, Failed, Failed, RetryScheduled
              { Success: 20, RetryScheduled: 20, Failed: 60, status: 'OK' },
              // Failed, Failed, Failed, RetryScheduled, RetryScheduled
              { Success: 0, RetryScheduled: 40, Failed: 60, status: 'OK' },
              // Failed, Failed, RetryScheduled, RetryScheduled, Success
              { Success: 20, RetryScheduled: 40, Failed: 40, status: 'OK' },
              // Failed, RetryScheduled, RetryScheduled, Success, Success
              { Success: 40, RetryScheduled: 40, Failed: 20, status: 'OK' },
            ]);
            resolve();
          } catch (e) {
            reject(e);
          }
        });

      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Failed));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Failed));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Failed));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.RetryScheduled));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.RetryScheduled));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
    });
  });

  test('frequency of task run results return an error health status when failure is above a certain threshold', async () => {
    const events$ = new Subject<TaskLifecycleEvent>();

    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });

    const runningAverageWindowSize = 5;
    const taskRunAggregator = createTaskRunAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize
    );

    return new Promise((resolve, reject) => {
      taskRunAggregator
        .pipe(
          // skip initial stat which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          // Use 'summarizeTaskRunStat' to receive summarize stats
          map(({ key, value }: AggregatedStat<TaskRunStat>) => ({
            key,
            value: summarizeTaskRunStat(
              value,
              getTaskManagerConfig({
                monitored_task_execution_thresholds: {
                  custom: {
                    'alerting:test': {
                      error_threshold: 59,
                      warn_threshold: 39,
                    },
                  },
                },
              })
            ).value,
          })),
          take(10),
          bufferCount(10)
        )
        .subscribe((taskStats: Array<AggregatedStat<SummarizedTaskRunStat>>) => {
          try {
            /**
             * At any given time we only keep track of the last X Polling Results
             * In the tests this is ocnfiugured to a window size of 5
             */
            expect(
              taskStats.map(
                (taskStat) =>
                  taskStat.value.execution.result_frequency_percent_as_number['alerting:test']
              )
            ).toEqual([
              // Success
              { Success: 100, RetryScheduled: 0, Failed: 0, status: 'OK' },
              // Success, Success,
              { Success: 100, RetryScheduled: 0, Failed: 0, status: 'OK' },
              // Success, Success, Success
              { Success: 100, RetryScheduled: 0, Failed: 0, status: 'OK' },
              // Success, Success, Success, Failed
              { Success: 75, RetryScheduled: 0, Failed: 25, status: 'OK' },
              // Success, Success, Success, Failed, Failed
              { Success: 60, RetryScheduled: 0, Failed: 40, status: 'warn' },
              // Success, Success, Failed, Failed, Failed
              { Success: 40, RetryScheduled: 0, Failed: 60, status: 'error' },
              // Success, Failed, Failed, Failed, RetryScheduled
              { Success: 20, RetryScheduled: 20, Failed: 60, status: 'error' },
              // Failed, Failed, Failed, RetryScheduled, RetryScheduled
              { Success: 0, RetryScheduled: 40, Failed: 60, status: 'error' },
              // Failed, Failed, RetryScheduled, RetryScheduled, Success
              { Success: 20, RetryScheduled: 40, Failed: 40, status: 'warn' },
              // Failed, RetryScheduled, RetryScheduled, Success, Success
              { Success: 40, RetryScheduled: 40, Failed: 20, status: 'OK' },
            ]);
            resolve();
          } catch (e) {
            reject(e);
          }
        });

      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Failed));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Failed));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Failed));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.RetryScheduled));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.RetryScheduled));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
      events$.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
    });
  });

  test('returns polling stats', async () => {
    const expectedTimestamp: string[] = [];
    const events$ = new Subject<TaskLifecycleEvent>();
    const taskPollingLifecycle = taskPollingLifecycleMock.create({
      events$: events$ as Observable<TaskLifecycleEvent>,
    });

    const runningAverageWindowSize = 5;
    const taskRunAggregator = createTaskRunAggregator(
      taskPollingLifecycle,
      runningAverageWindowSize
    );

    return new Promise((resolve, reject) => {
      taskRunAggregator
        .pipe(
          // skip initial stat which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          // Use 'summarizeTaskRunStat' to receive summarize stats
          map(({ key, value }: AggregatedStat<TaskRunStat>) => ({
            key,
            value: summarizeTaskRunStat(value, getTaskManagerConfig()).value,
          })),
          tap(() => {
            expectedTimestamp.push(new Date().toISOString());
            // each event is a second after the previous one
            fakeTimer.tick(1000);
          }),
          take(10),
          bufferCount(10)
        )
        .subscribe((taskStats: Array<AggregatedStat<SummarizedTaskRunStat>>) => {
          try {
            expect(
              taskStats.map((taskStat) => taskStat.value.polling.last_successful_poll)
            ).toEqual(expectedTimestamp);

            /**
             * At any given time we only keep track of the last X Polling Results
             * In the tests this is ocnfiugured to a window size of 5
             */
            expect(
              taskStats.map((taskStat) => taskStat.value.polling.result_frequency_percent_as_number)
            ).toEqual([
              // NoTasksClaimed
              { NoTasksClaimed: 100, RanOutOfCapacity: 0, PoolFilled: 0 },
              // NoTasksClaimed, NoTasksClaimed,
              { NoTasksClaimed: 100, RanOutOfCapacity: 0, PoolFilled: 0 },
              // NoTasksClaimed, NoTasksClaimed, NoTasksClaimed
              { NoTasksClaimed: 100, RanOutOfCapacity: 0, PoolFilled: 0 },
              // NoTasksClaimed, NoTasksClaimed, NoTasksClaimed, PoolFilled
              { NoTasksClaimed: 75, RanOutOfCapacity: 0, PoolFilled: 25 },
              // NoTasksClaimed, NoTasksClaimed, NoTasksClaimed, PoolFilled, PoolFilled
              { NoTasksClaimed: 60, RanOutOfCapacity: 0, PoolFilled: 40 },
              // NoTasksClaimed, NoTasksClaimed, PoolFilled, PoolFilled, PoolFilled
              { NoTasksClaimed: 40, RanOutOfCapacity: 0, PoolFilled: 60 },
              // NoTasksClaimed, PoolFilled, PoolFilled, PoolFilled, RanOutOfCapacity
              { NoTasksClaimed: 20, RanOutOfCapacity: 20, PoolFilled: 60 },
              // PoolFilled, PoolFilled, PoolFilled, RanOutOfCapacity, RanOutOfCapacity
              { NoTasksClaimed: 0, RanOutOfCapacity: 40, PoolFilled: 60 },
              // PoolFilled, PoolFilled, RanOutOfCapacity, RanOutOfCapacity, NoTasksClaimed
              { NoTasksClaimed: 20, RanOutOfCapacity: 40, PoolFilled: 40 },
              // PoolFilled, RanOutOfCapacity, RanOutOfCapacity, NoTasksClaimed, NoTasksClaimed
              { NoTasksClaimed: 40, RanOutOfCapacity: 40, PoolFilled: 20 },
            ]);
            resolve();
          } catch (e) {
            reject(e);
          }
        });

      events$.next(asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)));
      events$.next(asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)));
      events$.next(asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)));
      events$.next(asTaskPollingCycleEvent(asOk(FillPoolResult.PoolFilled)));
      events$.next(asTaskPollingCycleEvent(asOk(FillPoolResult.PoolFilled)));
      events$.next(asTaskPollingCycleEvent(asOk(FillPoolResult.PoolFilled)));
      events$.next(asTaskPollingCycleEvent(asOk(FillPoolResult.RanOutOfCapacity)));
      events$.next(asTaskPollingCycleEvent(asOk(FillPoolResult.RanOutOfCapacity)));
      events$.next(asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)));
      events$.next(asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)));
    });
  });
});

function runAtMillisecondsAgo(ms: number): Date {
  return new Date(Date.now() - ms);
}

const mockTaskRunEvent = (
  overrides: Partial<ConcreteTaskInstance> = {},
  timing: TaskTiming,
  result: TaskRunResult = TaskRunResult.Success
) => {
  const task = mockTaskInstance(overrides);
  return asTaskRunEvent(task.id, asOk({ task, result }), timing);
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

const getTaskManagerConfig = (overrides: unknown = {}) => configSchema.validate(overrides);
