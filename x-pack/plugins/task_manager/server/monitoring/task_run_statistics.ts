/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineLatest, Observable } from 'rxjs';
import { filter, startWith, map } from 'rxjs/operators';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { mapValues } from 'lodash';
import { AggregatedStatProvider, AggregatedStat } from './runtime_statistics_aggregator';
import { TaskManager, TaskLifecycleEvent } from '../task_manager';
import { isTaskRunEvent, isTaskPollingCycleEvent } from '../task_events';
import { isOk, Ok } from '../lib/result_type';
import { ConcreteTaskInstance } from '../task';
import { FillPoolResult } from '../lib/fill_pool';
import {
  AveragedStat,
  calculateRunningAverage,
  calculateFrequency,
  createRunningAveragedStat,
  createMapOfRunningAveragedStats,
} from './task_run_calcultors';

interface FillPoolStat extends JsonObject {
  lastSuccessfulPoll: string;
  resultFrequency: FillPoolResult[];
}

export interface TaskRunStat extends JsonObject {
  drift: number[];
  duration: Record<string, number[]>;
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
  duration: Record<string, AveragedStat>;
  polling: FillPoolRawStat | Omit<FillPoolRawStat, 'lastSuccessfulPoll'>;
}

export function createTaskRunAggregator(
  taskManager: TaskManager,
  runningAverageWindowSize: number
): AggregatedStatProvider<TaskRunStat> {
  const driftQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const taskRunDurationQueue = createMapOfRunningAveragedStats<number>(runningAverageWindowSize);
  const taskRunEvents$: Observable<Pick<
    TaskRunStat,
    'drift' | 'duration'
  >> = taskManager.events.pipe(
    filter(
      (taskEvent: TaskLifecycleEvent) =>
        isTaskRunEvent(taskEvent) &&
        isOk<ConcreteTaskInstance, unknown>(taskEvent.event) &&
        !!taskEvent?.timing?.start
    ),
    map((taskEvent: TaskLifecycleEvent) => {
      const task = (taskEvent.event as Ok<ConcreteTaskInstance>).value;
      const { timing } = taskEvent;
      return {
        duration: taskRunDurationQueue(task.taskType, timing!.stop - timing!.start),
        drift: driftQueue(timing!.start - task.runAt.getTime()),
      };
    })
  );

  const resultFrequencyQueue = createRunningAveragedStat<FillPoolResult>(runningAverageWindowSize);
  const taskPollingEvents$: Observable<TaskRunStat['polling']> = taskManager.events.pipe(
    filter(
      (taskEvent: TaskLifecycleEvent) =>
        isTaskPollingCycleEvent(taskEvent) && isOk<FillPoolResult, unknown>(taskEvent.event)
    ),
    map((taskEvent: TaskLifecycleEvent) => {
      return {
        lastSuccessfulPoll: new Date().toISOString(),
        resultFrequency: resultFrequencyQueue((taskEvent.event as Ok<FillPoolResult>).value),
      };
    })
  );

  return combineLatest(
    taskRunEvents$.pipe(startWith({ duration: {}, drift: [] })),
    taskPollingEvents$.pipe(
      startWith({
        resultFrequency: [],
      })
    )
  ).pipe(
    map(([taskRun, polling]) => {
      return {
        key: 'runtime',
        value: {
          ...taskRun,
          polling,
        },
      } as AggregatedStat<TaskRunStat>;
    })
  );
}

export function summarizeTaskRunStat({
  polling: { lastSuccessfulPoll, resultFrequency },
  drift,
  duration,
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
    duration: mapValues(duration, (typedDuration) => calculateRunningAverage(typedDuration)),
  };
}
