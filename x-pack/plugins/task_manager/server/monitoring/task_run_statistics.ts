/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { of, empty } from 'rxjs';
import { filter, flatMap } from 'rxjs/operators';
import { isUndefined, countBy, mapValues } from 'lodash';
import stats from 'stats-lite';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { AggregatedStatProvider, AggregatedStat } from './runtime_statistics_aggregator';
import { TaskManager, TaskLifecycleEvent } from '../task_manager';
import { isTaskRunEvent, isTaskPollingCycleEvent } from '../task_events';
import { isOk } from '../lib/result_type';
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
  runningAverageWindowSize: number,
  logger: Logger
): AggregatedStatProvider<TaskRunStat> {
  const runningStats: {
    runtime: {
      polling: {
        lastSuccessfulPoll: (value?: string) => string | undefined;
        resultFrequency: (value?: FillPoolResult) => FillPoolResult[];
      };
      drift: (value?: number) => number[];
    };
  } = {
    runtime: {
      polling: {
        lastSuccessfulPoll: createLastValueStat<string>(),
        resultFrequency: createRunningAveragedStat<FillPoolResult>(runningAverageWindowSize),
      },
      drift: createRunningAveragedStat<number>(runningAverageWindowSize),
    },
  };
  return taskManager.events.pipe(
    filter(
      (taskEvent: TaskLifecycleEvent) =>
        (isTaskRunEvent(taskEvent) || isTaskPollingCycleEvent(taskEvent)) &&
        isOk<ConcreteTaskInstance | FillPoolResult, unknown>(taskEvent.event)
    ),
    flatMap((taskEvent: TaskLifecycleEvent) => {
      if (isTaskRunEvent(taskEvent) && isOk(taskEvent.event)) {
        const task = taskEvent.event.value;
        const now = Date.now();
        return of({
          key: 'runtime',
          value: {
            polling: {
              lastSuccessfulPoll: runningStats.runtime.polling.lastSuccessfulPoll(),
              resultFrequency: runningStats.runtime.polling.resultFrequency(),
            },
            drift: runningStats.runtime.drift(now - task.runAt.getTime()),
          },
        } as AggregatedStat<TaskRunStat>);
      } else if (isTaskPollingCycleEvent(taskEvent) && isOk(taskEvent.event)) {
        return of({
          key: 'runtime',
          value: {
            polling: {
              lastSuccessfulPoll: runningStats.runtime.polling.lastSuccessfulPoll(
                new Date().toISOString()
              ),
              resultFrequency: runningStats.runtime.polling.resultFrequency(taskEvent.event.value),
            },
            drift: runningStats.runtime.drift(),
          },
        } as AggregatedStat<TaskRunStat>);
      }
      return empty();
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

function calculateFrequency<T>(values: T[]): JsonObject {
  return mapValues(countBy(values), (count) => Math.round((count * 100) / values.length));
}

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
