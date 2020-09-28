/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { Subject } from 'rxjs';
import stats from 'stats-lite';
import sinon from 'sinon';
import { take, tap, bufferCount, startWith, map } from 'rxjs/operators';

import { ConcreteTaskInstance, TaskStatus } from '../task';
import { asTaskRunEvent, asTaskPollingCycleEvent } from '../task_events';
import { asOk } from '../lib/result_type';
import { TaskLifecycleEvent } from '../task_manager';
import {
  createTaskRunAggregator,
  summarizeTaskRunStat,
  TaskRunStat,
  SummarizedTaskRunStat,
} from './task_run_statistics';
import { taskManagerMock } from '../task_manager.mock';
import { mockLogger } from '../test_utils';
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
    const taskManager = taskManagerMock.create({
      events: new Subject<TaskLifecycleEvent>().pipe(
        startWith(
          ...runAtDrift.map((drift) => mockTaskRunEvent({ runAt: runAtMillisecondsAgo(drift) }))
        )
      ),
    });

    const runningAverageWindowSize = 5;
    const taskRunAggregator = createTaskRunAggregator(
      taskManager,
      runningAverageWindowSize,
      mockLogger()
    );

    function expectWindowEqualsUpdate(
      taskStat: AggregatedStat<SummarizedTaskRunStat>,
      window: number[]
    ) {
      expect(taskStat.value.drift).toMatchObject({
        mean: stats.mean(window),
        median: stats.median(window),
        mode: stats.mode(window),
      });
    }

    return new Promise((resolve) => {
      taskRunAggregator
        .pipe(
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
    });
  });

  test('returns polling stats', async () => {
    const expectedTimestamp: string[] = [];
    const taskManager = taskManagerMock.create({
      events: new Subject<TaskLifecycleEvent>().pipe(
        startWith(
          asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)),
          asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)),
          asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)),
          asTaskPollingCycleEvent(asOk(FillPoolResult.PoolFilled)),
          asTaskPollingCycleEvent(asOk(FillPoolResult.PoolFilled)),
          asTaskPollingCycleEvent(asOk(FillPoolResult.PoolFilled)),
          asTaskPollingCycleEvent(asOk(FillPoolResult.RanOutOfCapacity)),
          asTaskPollingCycleEvent(asOk(FillPoolResult.RanOutOfCapacity)),
          asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed)),
          asTaskPollingCycleEvent(asOk(FillPoolResult.NoTasksClaimed))
        )
      ),
    });

    const runningAverageWindowSize = 5;
    const taskRunAggregator = createTaskRunAggregator(
      taskManager,
      runningAverageWindowSize,
      mockLogger()
    );

    return new Promise((resolve) => {
      taskRunAggregator
        .pipe(
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
        });
    });
  });
});

function runAtMillisecondsAgo(ms: number): Date {
  return new Date(Date.now() - ms);
}

const mockTaskRunEvent = (overrides: Partial<ConcreteTaskInstance> = {}) => {
  const task = mockTaskInstance(overrides);
  return asTaskRunEvent(task.id, asOk(task));
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
