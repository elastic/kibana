/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { Subject } from 'rxjs';
import stats from 'stats-lite';
import sinon from 'sinon';
import { take, tap, bufferCount, skip, map } from 'rxjs/operators';

import { ConcreteTaskInstance, TaskStatus } from '../task';
import { asTaskRunEvent, asTaskPollingCycleEvent, TaskTiming } from '../task_events';
import { asOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../task_manager';
import { TaskRunResult } from '../task_runner';
import {
  createTaskRunAggregator,
  summarizeTaskRunStat,
  TaskRunStat,
  SummarizedTaskRunStat,
} from './task_run_statistics';
import { taskManagerMock } from '../task_manager.mock';
import { AggregatedStat } from './runtime_statistics_aggregator';
import { FillPoolResult } from '../lib/fill_pool';

describe('Task Run Statistics', () => {
  let fakeTimer: sinon.SinonFakeTimers;

  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
  });

  afterAll(() => fakeTimer.restore());

  test('returns a running average of task drift', async () => {
    const runAtDrift = [1000, 2000, 500, 300, 400, 15000, 20000, 200];
    const events = new Subject<TaskLifecycleEvent>();
    const taskManager = taskManagerMock.create({
      events,
    });

    const runningAverageWindowSize = 5;
    const taskRunAggregator = createTaskRunAggregator(taskManager, runningAverageWindowSize);

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedTaskRunStat>,
      window: number[]
    ) {
      expect(taskStat.value.drift).toMatchObject({
        mean: Math.round(stats.mean(window)),
        median: stats.median(window),
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
            value: summarizeTaskRunStat(value),
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
        events.next(
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
    const events = new Subject<TaskLifecycleEvent>();
    const taskManager = taskManagerMock.create({
      events,
    });

    const runningAverageWindowSize = 5;
    const taskRunAggregator = createTaskRunAggregator(taskManager, runningAverageWindowSize);

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedTaskRunStat>,
      windows: Record<string, number[]>
    ) {
      for (const [type, window] of Object.entries(windows)) {
        expect(taskStat.value.duration[type]).toMatchObject({
          mean: Math.round(stats.mean(window)),
          median: stats.median(window),
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
            value: summarizeTaskRunStat(value),
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
        events.next(
          mockTaskRunEvent(
            { taskType: 'alerting:test' },
            { start: runAtMillisecondsAgo(runDuration).getTime(), stop: now }
          )
        );
      }
      for (const runDuration of runDurationsInReverse) {
        events.next(
          mockTaskRunEvent(
            { taskType: 'actions:test' },
            { start: runAtMillisecondsAgo(runDuration).getTime(), stop: now }
          )
        );
      }
    });
  });

  test('returns the frequency of task run results', async () => {
    const events = new Subject<TaskLifecycleEvent>();
    const taskManager = taskManagerMock.create({
      events,
    });

    const runningAverageWindowSize = 5;
    const taskRunAggregator = createTaskRunAggregator(taskManager, runningAverageWindowSize);

    return new Promise((resolve, reject) => {
      taskRunAggregator
        .pipe(
          // skip initial stat which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          // Use 'summarizeTaskRunStat' to receive summarize stats
          map(({ key, value }: AggregatedStat<TaskRunStat>) => ({
            key,
            value: summarizeTaskRunStat(value),
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
            expect(taskStats.map((taskStat) => taskStat.value.taskRunResultFrequency)).toEqual([
              // Success
              { Success: 100, RetryScheduled: 0, Failed: 0 },
              // Success, Success,
              { Success: 100, RetryScheduled: 0, Failed: 0 },
              // Success, Success, Success
              { Success: 100, RetryScheduled: 0, Failed: 0 },
              // Success, Success, Success, Failed
              { Success: 75, RetryScheduled: 0, Failed: 25 },
              // Success, Success, Success, Failed, Failed
              { Success: 60, RetryScheduled: 0, Failed: 40 },
              // Success, Success, Failed, Failed, Failed
              { Success: 40, RetryScheduled: 0, Failed: 60 },
              // Success, Failed, Failed, Failed, RetryScheduled
              { Success: 20, RetryScheduled: 20, Failed: 60 },
              // Failed, Failed, Failed, RetryScheduled, RetryScheduled
              { Success: 0, RetryScheduled: 40, Failed: 60 },
              // Failed, Failed, RetryScheduled, RetryScheduled, Success
              { Success: 20, RetryScheduled: 40, Failed: 40 },
              // Failed, RetryScheduled, RetryScheduled, Success, Success
              { Success: 40, RetryScheduled: 40, Failed: 20 },
            ]);
            resolve();
          } catch (e) {
            reject(e);
          }
        });

      events.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
      events.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
      events.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
      events.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Failed));
      events.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Failed));
      events.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Failed));
      events.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.RetryScheduled));
      events.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.RetryScheduled));
      events.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
      events.next(mockTaskRunEvent({}, { start: 0, stop: 0 }, TaskRunResult.Success));
    });
  });

  test('returns polling stats', async () => {
    const expectedTimestamp: string[] = [];
    const events = new Subject<TaskLifecycleEvent>();
    const taskManager = taskManagerMock.create({
      events,
    });

    const runningAverageWindowSize = 5;
    const taskRunAggregator = createTaskRunAggregator(taskManager, runningAverageWindowSize);

    return new Promise((resolve, reject) => {
      taskRunAggregator
        .pipe(
          // skip initial stat which is just initialized data which
          // ensures we don't stall on combineLatest
          skip(1),
          // Use 'summarizeTaskRunStat' to receive summarize stats
          map(({ key, value }: AggregatedStat<TaskRunStat>) => ({
            key,
            value: summarizeTaskRunStat(value),
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
            expect(taskStats.map((taskStat) => taskStat.value.polling.lastSuccessfulPoll)).toEqual(
              expectedTimestamp
            );

            /**
             * At any given time we only keep track of the last X Polling Results
             * In the tests this is ocnfiugured to a window size of 5
             */
            expect(taskStats.map((taskStat) => taskStat.value.polling.resultFrequency)).toEqual([
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

      events.next(asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)));
      events.next(asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)));
      events.next(asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)));
      events.next(asTaskPollingCycleEvent(asOk(FillPoolResult.PoolFilled)));
      events.next(asTaskPollingCycleEvent(asOk(FillPoolResult.PoolFilled)));
      events.next(asTaskPollingCycleEvent(asOk(FillPoolResult.PoolFilled)));
      events.next(asTaskPollingCycleEvent(asOk(FillPoolResult.RanOutOfCapacity)));
      events.next(asTaskPollingCycleEvent(asOk(FillPoolResult.RanOutOfCapacity)));
      events.next(asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)));
      events.next(asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)));
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
