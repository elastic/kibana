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
import {
  isTaskRunEvent,
  isTaskPollingCycleEvent,
  TaskRun,
  ErroredTask,
  RanTask,
  TaskTiming,
} from '../task_events';
import { isOk, Ok, unwrap } from '../lib/result_type';
import { ConcreteTaskInstance } from '../task';
import { TaskRunResult } from '../task_runner';
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
  taskRunResultFrequency: TaskRunResult[];
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
  taskRunResultFrequency: {
    [TaskRunResult.Success]: number;
    [TaskRunResult.SuccessRescheduled]: number;
    [TaskRunResult.RetryScheduled]: number;
    [TaskRunResult.Failed]: number;
  };
  polling: FillPoolRawStat | Omit<FillPoolRawStat, 'lastSuccessfulPoll'>;
}

export function createTaskRunAggregator(
  taskManager: TaskManager,
  runningAverageWindowSize: number
): AggregatedStatProvider<TaskRunStat> {
  const taskRunEventToStat = createTaskRunEventToStat(runningAverageWindowSize);
  const taskRunEvents$: Observable<Omit<TaskRunStat, 'polling'>> = taskManager.events.pipe(
    filter((taskEvent: TaskLifecycleEvent) => isTaskRunEvent(taskEvent) && hasTiming(taskEvent)),
    map((taskEvent: TaskLifecycleEvent) => {
      const { task, result }: RanTask | ErroredTask = unwrap((taskEvent as TaskRun).event);
      return taskRunEventToStat(task, taskEvent.timing!, result);
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
    taskRunEvents$.pipe(startWith({ duration: {}, drift: [], taskRunResultFrequency: [] })),
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

function hasTiming(taskEvent: TaskLifecycleEvent) {
  return !!taskEvent?.timing;
}

function createTaskRunEventToStat(runningAverageWindowSize: number) {
  const driftQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const taskRunDurationQueue = createMapOfRunningAveragedStats<number>(runningAverageWindowSize);
  const resultFrequencyQueue = createRunningAveragedStat<TaskRunResult>(runningAverageWindowSize);
  return (
    task: ConcreteTaskInstance,
    timing: TaskTiming,
    result: TaskRunResult
  ): Omit<TaskRunStat, 'polling'> => ({
    duration: taskRunDurationQueue(task.taskType, timing!.stop - timing!.start),
    drift: driftQueue(timing!.start - task.runAt.getTime()),
    taskRunResultFrequency: resultFrequencyQueue(result),
  });
}

export function summarizeTaskRunStat({
  polling: { lastSuccessfulPoll, resultFrequency },
  drift,
  duration,
  taskRunResultFrequency,
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
    taskRunResultFrequency: {
      [TaskRunResult.Success]: 0,
      [TaskRunResult.SuccessRescheduled]: 0,
      [TaskRunResult.RetryScheduled]: 0,
      [TaskRunResult.Failed]: 0,
      ...calculateFrequency<TaskRunResult>(taskRunResultFrequency),
    },
  };
}
