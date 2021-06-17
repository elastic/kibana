/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, filter, startWith, buffer, share } from 'rxjs/operators';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { Observable, zip } from 'rxjs';
import { isOk, Ok } from '../lib/result_type';
import { AggregatedStat, AggregatedStatProvider } from './runtime_statistics_aggregator';
import { EphemeralTaskLifecycle } from '../ephemeral_task_lifecycle';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { isTaskRunEvent, isTaskManagerStatEvent } from '../task_events';
import {
  AveragedStat,
  calculateRunningAverage,
  createRunningAveragedStat,
} from './task_run_calcultors';
import { HealthStatus } from './monitoring_stats_stream';

export interface EphemeralTaskStat extends JsonObject {
  queuedTasks: number[];
  executionsPerCycle: number[];
  load: number[];
}

export interface SummarizedEphemeralTaskStat extends JsonObject {
  queuedTasks: AveragedStat;
  executionsPerCycle: AveragedStat;
  load: AveragedStat;
}
export function createEphemeralTaskAggregator(
  ephemeralTaskLifecycle: EphemeralTaskLifecycle,
  runningAverageWindowSize: number,
  maxWorkers: number
): AggregatedStatProvider<EphemeralTaskStat> {
  const ephemeralTaskRunEvents$ = ephemeralTaskLifecycle.events.pipe(
    filter((taskEvent: TaskLifecycleEvent) => isTaskRunEvent(taskEvent))
  );

  const ephemeralQueueSizeEvents$: Observable<number> = ephemeralTaskLifecycle.events.pipe(
    filter(
      (taskEvent: TaskLifecycleEvent) =>
        isTaskManagerStatEvent(taskEvent) &&
        taskEvent.id === 'queuedEphemeralTasks' &&
        isOk<number, never>(taskEvent.event)
    ),
    map<TaskLifecycleEvent, number>((taskEvent: TaskLifecycleEvent) => {
      return ((taskEvent.event as unknown) as Ok<number>).value;
    }),
    // as we consume this stream twice below (in the buffer, and the zip)
    // we want to use share, otherwise ther'll be 2 subscribers and both will emit event
    share()
  );

  const ephemeralQueueExecutionsPerCycleQueue = createRunningAveragedStat<number>(
    runningAverageWindowSize
  );
  const ephemeralQueuedTasksQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  const ephemeralTaskLoadQueue = createRunningAveragedStat<number>(runningAverageWindowSize);
  return zip(
    ephemeralTaskRunEvents$.pipe(
      buffer(ephemeralQueueSizeEvents$),
      map((taskEvents: TaskLifecycleEvent[]) => taskEvents.length)
    ),
    ephemeralQueueSizeEvents$
  )
    .pipe(
      map(([tasksRanSincePreviousQueueSize, ephemeralQueueSize]) => ({
        queuedTasks: ephemeralQueuedTasksQueue(ephemeralQueueSize),
        executionsPerCycle: ephemeralQueueExecutionsPerCycleQueue(tasksRanSincePreviousQueueSize),
        load: ephemeralTaskLoadQueue(
          calculateWorkerLoad(maxWorkers, tasksRanSincePreviousQueueSize)
        ),
      }))
    )
    .pipe(
      startWith({
        queuedTasks: [],
        executionsPerCycle: [],
        load: [],
      }),
      map((stats: EphemeralTaskStat) => {
        return {
          key: 'ephemeral',
          value: stats,
        } as AggregatedStat<EphemeralTaskStat>;
      })
    );
}

function calculateWorkerLoad(maxWorkers: number, tasksExecuted: number) {
  return Math.round((tasksExecuted * 100) / maxWorkers);
}

export function summarizeEphemeralStat({
  queuedTasks,
  executionsPerCycle,
  load,
}: EphemeralTaskStat): { value: SummarizedEphemeralTaskStat; status: HealthStatus } {
  return {
    value: {
      queuedTasks: calculateRunningAverage(queuedTasks.length ? queuedTasks : [0]),
      load: calculateRunningAverage(load.length ? load : [0]),
      executionsPerCycle: calculateRunningAverage(
        executionsPerCycle.length ? executionsPerCycle : [0]
      ),
    },
    status: HealthStatus.OK,
  };
}
