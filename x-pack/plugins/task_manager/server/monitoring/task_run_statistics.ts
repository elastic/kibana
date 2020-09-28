/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineLatest, Observable } from 'rxjs';
import { filter, startWith, map } from 'rxjs/operators';
import { isUndefined, countBy, mapValues } from 'lodash';
import stats from 'stats-lite';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { AggregatedStatProvider, AggregatedStat } from './runtime_statistics_aggregator';
import { TaskManager, TaskLifecycleEvent } from '../task_manager';
import { isTaskRunEvent, isTaskPollingCycleEvent } from '../task_events';
import { isOk, Ok } from '../lib/result_type';
import { ConcreteTaskInstance } from '../task';
import { FillPoolResult } from '../lib/fill_pool';

interface AveragedStat extends JsonObject {
  mean: number;
  median: number;
  mode: number;
}

interface FillPoolStat extends JsonObject {
  lastSuccessfulPoll: string;
  resultFrequency: FillPoolResult[];
}

export interface TaskRunStat extends JsonObject {
  drift: number[];
  polling: FillPoolStat | Omit<FillPoolStat, 'lastSuccessfulPoll'>;
}

interface FillPoolRawStat extends JsonObject {
  lastSuccessfulPoll: string;
  resultFrequency: {
    [FillPoolResult.NoTasksClaimed]: number;
    [FillPoolResult.RanOutOfCapacity]: number;
    [FillPoolResult.PoolFilled]: number;
  };
}

export interface SummarizedTaskRunStat extends JsonObject {
  drift: AveragedStat;
  polling: FillPoolRawStat | Omit<FillPoolRawStat, 'lastSuccessfulPoll'>;
}

export function createTaskRunAggregator(
  taskManager: TaskManager,
  runningAverageWindowSize: number
): AggregatedStatProvider<TaskRunStat> {
  const driftQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const taskRunEvents$: Observable<TaskRunStat['drift']> = taskManager.events.pipe(
    filter(
      (taskEvent: TaskLifecycleEvent) =>
        isTaskRunEvent(taskEvent) && isOk<ConcreteTaskInstance, unknown>(taskEvent.event)
    ),
    map((taskEvent: TaskLifecycleEvent) => {
      const task = (taskEvent.event as Ok<ConcreteTaskInstance>).value;
      const now = Date.now();
      return driftQueue(now - task.runAt.getTime());
    })
  );

  const pollingQueue = {
    lastSuccessfulPoll: createLastValueStat<string>(),
    resultFrequency: createRunningAveragedStat<FillPoolResult>(runningAverageWindowSize),
  };
  const taskPollingEvents$: Observable<TaskRunStat['polling']> = taskManager.events.pipe(
    filter(
      (taskEvent: TaskLifecycleEvent) =>
        isTaskPollingCycleEvent(taskEvent) && isOk<FillPoolResult, unknown>(taskEvent.event)
    ),
    map((taskEvent: TaskLifecycleEvent) => {
      return {
        lastSuccessfulPoll: pollingQueue.lastSuccessfulPoll(new Date().toISOString()),
        resultFrequency: pollingQueue.resultFrequency(
          (taskEvent.event as Ok<FillPoolResult>).value
        ),
      };
    })
  );

  return combineLatest(
    taskRunEvents$.pipe(startWith([])),
    taskPollingEvents$.pipe(
      startWith({
        resultFrequency: {
          [FillPoolResult.NoTasksClaimed]: 0,
          [FillPoolResult.RanOutOfCapacity]: 0,
          [FillPoolResult.PoolFilled]: 0,
        },
      })
    )
  ).pipe(
    map(([drift, polling]) => {
      return {
        key: 'runtime',
        value: {
          drift,
          polling,
        },
      } as AggregatedStat<TaskRunStat>;
    })
  );
}

export function summarizeTaskRunStat({
  polling: { lastSuccessfulPoll, resultFrequency },
  drift,
}: TaskRunStat): SummarizedTaskRunStat {
  return {
    polling: {
      ...(lastSuccessfulPoll ? { lastSuccessfulPoll } : {}),
      resultFrequency: {
        [FillPoolResult.NoTasksClaimed]: 0,
        [FillPoolResult.RanOutOfCapacity]: 0,
        [FillPoolResult.PoolFilled]: 0,
        ...calculateFrequency<FillPoolResult>(resultFrequency as FillPoolResult[]),
      },
    },
    drift: calculateRunningAverage(drift),
  };
}

function calculateRunningAverage(values: number[]): AveragedStat {
  return {
    mean: stats.mean(values),
    median: stats.median(values),
    mode: stats.mode(values),
  };
}

/**
 * Calculate the frequency of each term in a list of terms.
 * @param values
 */
function calculateFrequency<T>(values: T[]): JsonObject {
  return mapValues(countBy(values), (count) => Math.round((count * 100) / values.length));
}

/**
 * Utility to keep track of one value which might change over time
 */
function createLastValueStat<T>() {
  let lastValue: T;
  return (value?: T) => {
    if (isUndefined(value)) {
      return lastValue;
    } else {
      lastValue = value;
      return lastValue;
    }
  };
}

/**
 * Utility to keep track of a limited queue of values which changes over time
 * dropping older values as they slide out of the window we wish to track
 */
function createRunningAveragedStat<T>(runningAverageWindowSize: number) {
  const queue = new Array<T>();
  return (value?: T) => {
    if (isUndefined(value)) {
      return queue;
    } else {
      if (queue.length === runningAverageWindowSize) {
        queue.shift();
      }
      queue.push(value);
      return [...queue];
    }
  };
}
