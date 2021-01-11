/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineLatest, Observable } from 'rxjs';
import { filter, startWith, map } from 'rxjs/operators';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { isNumber, mapValues } from 'lodash';
import { AggregatedStatProvider, AggregatedStat } from './runtime_statistics_aggregator';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import {
  isTaskRunEvent,
  isTaskPollingCycleEvent,
  TaskRun,
  ErroredTask,
  RanTask,
  TaskTiming,
  isTaskManagerStatEvent,
} from '../task_events';
import { isOk, Ok, unwrap } from '../lib/result_type';
import { ConcreteTaskInstance } from '../task';
import { TaskRunResult } from '../task_running';
import { FillPoolResult, ClaimAndFillPoolResult } from '../lib/fill_pool';
import {
  AveragedStat,
  calculateRunningAverage,
  calculateFrequency,
  createRunningAveragedStat,
  createMapOfRunningAveragedStats,
} from './task_run_calcultors';
import { HealthStatus } from './monitoring_stats_stream';
import { TaskPollingLifecycle } from '../polling_lifecycle';
import { TaskExecutionFailureThreshold, TaskManagerConfig } from '../config';

interface FillPoolStat extends JsonObject {
  last_successful_poll: string;
  duration: number[];
  claim_conflicts: number[];
  claim_mismatches: number[];
  result_frequency_percent_as_number: FillPoolResult[];
}

interface ExecutionStat extends JsonObject {
  duration: Record<string, number[]>;
  result_frequency_percent_as_number: Record<string, TaskRunResult[]>;
}

export interface TaskRunStat extends JsonObject {
  drift: number[];
  load: number[];
  execution: ExecutionStat;
  polling: FillPoolStat | Omit<FillPoolStat, 'last_successful_poll'>;
}

interface FillPoolRawStat extends JsonObject {
  last_successful_poll: string;
  result_frequency_percent_as_number: {
    [FillPoolResult.Failed]: number;
    [FillPoolResult.NoAvailableWorkers]: number;
    [FillPoolResult.NoTasksClaimed]: number;
    [FillPoolResult.RanOutOfCapacity]: number;
    [FillPoolResult.RunningAtCapacity]: number;
    [FillPoolResult.PoolFilled]: number;
  };
}

interface ResultFrequency extends JsonObject {
  [TaskRunResult.Success]: number;
  [TaskRunResult.SuccessRescheduled]: number;
  [TaskRunResult.RetryScheduled]: number;
  [TaskRunResult.Failed]: number;
}

type ResultFrequencySummary = ResultFrequency & {
  status: HealthStatus;
};

export interface SummarizedTaskRunStat extends JsonObject {
  drift: AveragedStat;
  load: AveragedStat;
  execution: {
    duration: Record<string, AveragedStat>;
    result_frequency_percent_as_number: Record<string, ResultFrequencySummary>;
  };
  polling: FillPoolRawStat | Omit<FillPoolRawStat, 'last_successful_poll'>;
}

export function createTaskRunAggregator(
  taskPollingLifecycle: TaskPollingLifecycle,
  runningAverageWindowSize: number
): AggregatedStatProvider<TaskRunStat> {
  const taskRunEventToStat = createTaskRunEventToStat(runningAverageWindowSize);
  const taskRunEvents$: Observable<
    Pick<TaskRunStat, 'drift' | 'execution'>
  > = taskPollingLifecycle.events.pipe(
    filter((taskEvent: TaskLifecycleEvent) => isTaskRunEvent(taskEvent) && hasTiming(taskEvent)),
    map((taskEvent: TaskLifecycleEvent) => {
      const { task, result }: RanTask | ErroredTask = unwrap((taskEvent as TaskRun).event);
      return taskRunEventToStat(task, taskEvent.timing!, result);
    })
  );

  const loadQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const taskManagerLoadStatEvents$: Observable<
    Pick<TaskRunStat, 'load'>
  > = taskPollingLifecycle.events.pipe(
    filter(
      (taskEvent: TaskLifecycleEvent) =>
        isTaskManagerStatEvent(taskEvent) &&
        taskEvent.id === 'load' &&
        isOk<number, never>(taskEvent.event)
    ),
    map((taskEvent: TaskLifecycleEvent) => {
      return {
        load: loadQueue(((taskEvent.event as unknown) as Ok<number>).value),
      };
    })
  );

  const resultFrequencyQueue = createRunningAveragedStat<FillPoolResult>(runningAverageWindowSize);
  const pollingDurationQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const claimConflictsQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const claimMismatchesQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const taskPollingEvents$: Observable<
    Pick<TaskRunStat, 'polling'>
  > = taskPollingLifecycle.events.pipe(
    filter(
      (taskEvent: TaskLifecycleEvent) =>
        isTaskPollingCycleEvent(taskEvent) && isOk<ClaimAndFillPoolResult, unknown>(taskEvent.event)
    ),
    map((taskEvent: TaskLifecycleEvent) => {
      const {
        result,
        stats: { tasksClaimed, tasksUpdated, tasksConflicted } = {},
      } = ((taskEvent.event as unknown) as Ok<ClaimAndFillPoolResult>).value;
      const duration = (taskEvent?.timing?.stop ?? 0) - (taskEvent?.timing?.start ?? 0);
      return {
        polling: {
          last_successful_poll: new Date().toISOString(),
          // Track how long the polling cycle took from begining until all claimed tasks were marked as running
          duration: duration ? pollingDurationQueue(duration) : pollingDurationQueue(),
          // Track how many version conflicts occured during polling
          claim_conflicts: isNumber(tasksConflicted)
            ? claimConflictsQueue(tasksConflicted)
            : claimConflictsQueue(),
          // Track how much of a mismatch there is between claimed and updated
          claim_mismatches:
            isNumber(tasksClaimed) && isNumber(tasksUpdated)
              ? claimMismatchesQueue(tasksUpdated - tasksClaimed)
              : claimMismatchesQueue(),
          result_frequency_percent_as_number: resultFrequencyQueue(result),
        },
      };
    })
  );

  return combineLatest([
    taskRunEvents$.pipe(
      startWith({ drift: [], execution: { duration: {}, result_frequency_percent_as_number: {} } })
    ),
    taskManagerLoadStatEvents$.pipe(startWith({ load: [] })),
    taskPollingEvents$.pipe(
      startWith({
        polling: {
          duration: [],
          claim_conflicts: [],
          claim_mismatches: [],
          result_frequency_percent_as_number: [],
        },
      })
    ),
  ]).pipe(
    map(
      ([taskRun, load, polling]: [
        Pick<TaskRunStat, 'drift' | 'execution'>,
        Pick<TaskRunStat, 'load'>,
        Pick<TaskRunStat, 'polling'>
      ]) => {
        return {
          key: 'runtime',
          value: {
            ...taskRun,
            ...load,
            ...polling,
          },
        } as AggregatedStat<TaskRunStat>;
      }
    )
  );
}

function hasTiming(taskEvent: TaskLifecycleEvent) {
  return !!taskEvent?.timing;
}

function createTaskRunEventToStat(runningAverageWindowSize: number) {
  const driftQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const taskRunDurationQueue = createMapOfRunningAveragedStats<number>(runningAverageWindowSize);
  const resultFrequencyQueue = createMapOfRunningAveragedStats<TaskRunResult>(
    runningAverageWindowSize
  );
  return (
    task: ConcreteTaskInstance,
    timing: TaskTiming,
    result: TaskRunResult
  ): Omit<TaskRunStat, 'polling'> => ({
    drift: driftQueue(timing!.start - task.runAt.getTime()),
    execution: {
      duration: taskRunDurationQueue(task.taskType, timing!.stop - timing!.start),
      result_frequency_percent_as_number: resultFrequencyQueue(task.taskType, result),
    },
  });
}

const DEFAULT_TASK_RUN_FREQUENCIES = {
  [TaskRunResult.Success]: 0,
  [TaskRunResult.SuccessRescheduled]: 0,
  [TaskRunResult.RetryScheduled]: 0,
  [TaskRunResult.Failed]: 0,
};
const DEFAULT_POLLING_FREQUENCIES = {
  [FillPoolResult.Failed]: 0,
  [FillPoolResult.NoAvailableWorkers]: 0,
  [FillPoolResult.NoTasksClaimed]: 0,
  [FillPoolResult.RanOutOfCapacity]: 0,
  [FillPoolResult.RunningAtCapacity]: 0,
  [FillPoolResult.PoolFilled]: 0,
};

export function summarizeTaskRunStat(
  {
    polling: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      last_successful_poll,
      duration: pollingDuration,
      result_frequency_percent_as_number: pollingResultFrequency,
      claim_conflicts: claimConflicts,
      claim_mismatches: claimMismatches,
    },
    drift,
    load,
    execution: { duration, result_frequency_percent_as_number: executionResultFrequency },
  }: TaskRunStat,
  config: TaskManagerConfig
): { value: SummarizedTaskRunStat; status: HealthStatus } {
  return {
    value: {
      polling: {
        ...(last_successful_poll ? { last_successful_poll } : {}),
        duration: calculateRunningAverage(pollingDuration as number[]),
        claim_conflicts: calculateRunningAverage(claimConflicts as number[]),
        claim_mismatches: calculateRunningAverage(claimMismatches as number[]),
        result_frequency_percent_as_number: {
          ...DEFAULT_POLLING_FREQUENCIES,
          ...calculateFrequency<FillPoolResult>(pollingResultFrequency as FillPoolResult[]),
        },
      },
      drift: calculateRunningAverage(drift),
      load: calculateRunningAverage(load),
      execution: {
        duration: mapValues(duration, (typedDurations) => calculateRunningAverage(typedDurations)),
        result_frequency_percent_as_number: mapValues(
          executionResultFrequency,
          (typedResultFrequencies, taskType) =>
            summarizeTaskExecutionResultFrequencyStat(
              {
                ...DEFAULT_TASK_RUN_FREQUENCIES,
                ...calculateFrequency<TaskRunResult>(typedResultFrequencies),
              },
              config.monitored_task_execution_thresholds.custom[taskType] ??
                config.monitored_task_execution_thresholds.default
            )
        ),
      },
    },
    status: HealthStatus.OK,
  };
}

function summarizeTaskExecutionResultFrequencyStat(
  resultFrequencySummary: ResultFrequency,
  executionErrorThreshold: TaskExecutionFailureThreshold
): ResultFrequencySummary {
  return {
    ...resultFrequencySummary,
    status:
      resultFrequencySummary.Failed > executionErrorThreshold.warn_threshold
        ? resultFrequencySummary.Failed > executionErrorThreshold.error_threshold
          ? HealthStatus.Error
          : HealthStatus.Warning
        : HealthStatus.OK,
  };
}
