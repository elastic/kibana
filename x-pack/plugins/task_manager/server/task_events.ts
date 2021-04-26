/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Option } from 'fp-ts/lib/Option';

import { ConcreteTaskInstance } from './task';

import { Result, Err } from './lib/result_type';
import { ClaimAndFillPoolResult } from './lib/fill_pool';
import { PollingError } from './polling';
import { TaskRunResult } from './task_running';
import { CpuUtilization } from './lib/observed_cpu_utilization';

export enum TaskEventType {
  TASK_CLAIM = 'TASK_CLAIM',
  TASK_MARK_RUNNING = 'TASK_MARK_RUNNING',
  TASK_RUN = 'TASK_RUN',
  TASK_RUN_REQUEST = 'TASK_RUN_REQUEST',
  TASK_POLLING_CYCLE = 'TASK_POLLING_CYCLE',
  TASK_MANAGER_STAT = 'TASK_MANAGER_STAT',
}

export enum TaskClaimErrorType {
  CLAIMED_BY_ID_OUT_OF_CAPACITY = 'CLAIMED_BY_ID_OUT_OF_CAPACITY',
  CLAIMED_BY_ID_NOT_RETURNED = 'CLAIMED_BY_ID_NOT_RETURNED',
  CLAIMED_BY_ID_NOT_IN_CLAIMING_STATUS = 'CLAIMED_BY_ID_NOT_IN_CLAIMING_STATUS',
}

export interface TaskTiming {
  start: number;
  stop: number;
}

export interface TaskMetrics {
  cpu: CpuUtilization;
  timing: TaskTiming;
}

export function startTaskTimer(): () => TaskTiming {
  const start = Date.now();
  return () => ({ start, stop: Date.now() });
}

export type TaskEvent<
  OkResult,
  ErrorResult,
  ID = string,
  Metrics = Partial<TaskMetrics> | undefined
> = WithMetrics<
  {
    id?: ID;
    type: TaskEventType;
    event: Result<OkResult, ErrorResult>;
  },
  Metrics
>;

type WithMetrics<T, Metrics> = Metrics extends NonNullable<infer MetricsT>
  ? T & {
      metrics: MetricsT;
    }
  : T & {
      metrics?: Metrics;
    };

export interface RanTask {
  task: ConcreteTaskInstance;
  result: TaskRunResult;
}
export type ErroredTask = RanTask & {
  error: Error;
};
export interface ClaimTaskErr {
  task: Option<ConcreteTaskInstance>;
  errorType: TaskClaimErrorType;
}

export type TaskMarkRunning = TaskEvent<ConcreteTaskInstance, Error>;
export type TaskRun = TaskEvent<RanTask, ErroredTask>;
export type TaskClaim = TaskEvent<ConcreteTaskInstance, ClaimTaskErr>;
export type TaskRunRequest = TaskEvent<ConcreteTaskInstance, Error>;
export type TaskPollingCycle<T = string> = TaskEvent<ClaimAndFillPoolResult, PollingError<T>>;

// helper type which ensure the T has a `metrics` field of type TaskMetrics
export type TaskEventWithMetrics<T> = T extends TaskEvent<infer Ok, infer Err, infer ID>
  ? TaskEvent<Ok, Err, ID, NonNullable<TaskMetrics>>
  : T extends TaskEvent<infer Ok, infer Err>
  ? TaskEvent<Ok, Err, string, NonNullable<TaskMetrics>>
  : never;

export type TaskManagerStats = 'load' | 'pollingDelay' | 'claimDuration';
export type TaskManagerStat = TaskEvent<number, never, TaskManagerStats>;

export type OkResultOf<EventType> = EventType extends TaskEvent<infer OkResult, infer ErrorResult>
  ? OkResult
  : never;
export type ErrResultOf<EventType> = EventType extends TaskEvent<infer OkResult, infer ErrorResult>
  ? ErrorResult
  : never;

export function asTaskMarkRunningEvent(
  id: string,
  event: Result<ConcreteTaskInstance, Error>,
  metrics?: Partial<TaskMetrics>
): TaskMarkRunning {
  return {
    id,
    type: TaskEventType.TASK_MARK_RUNNING,
    event,
    metrics,
  };
}

export function asTaskRunEvent(
  id: string,
  event: Result<RanTask, ErroredTask>,
  metrics?: Partial<TaskMetrics>
): TaskRun {
  return {
    id,
    type: TaskEventType.TASK_RUN,
    event,
    metrics,
  };
}

export function asTaskClaimEvent(
  id: string,
  event: Result<ConcreteTaskInstance, ClaimTaskErr>,
  metrics?: Partial<TaskMetrics>
): TaskClaim {
  return {
    id,
    type: TaskEventType.TASK_CLAIM,
    event,
    metrics,
  };
}

export function asTaskRunRequestEvent(
  id: string,
  // we only emit a TaskRunRequest event when it fails
  event: Err<Error>,
  metrics?: Partial<TaskMetrics>
): TaskRunRequest {
  return {
    id,
    type: TaskEventType.TASK_RUN_REQUEST,
    event,
    metrics,
  };
}

export function asTaskPollingCycleEvent<T = string>(
  event: Result<ClaimAndFillPoolResult, PollingError<T>>,
  metrics?: Partial<TaskMetrics>
): TaskPollingCycle<T> {
  return {
    type: TaskEventType.TASK_POLLING_CYCLE,
    event,
    metrics,
  };
}

export function asTaskManagerStatEvent(
  id: TaskManagerStats,
  event: Result<number, never>
): TaskManagerStat {
  return {
    id,
    type: TaskEventType.TASK_MANAGER_STAT,
    event,
  };
}

export function isTaskMarkRunningEvent(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is TaskMarkRunning {
  return taskEvent.type === TaskEventType.TASK_MARK_RUNNING;
}
export function isTaskRunEvent(taskEvent: TaskEvent<unknown, unknown>): taskEvent is TaskRun {
  return taskEvent.type === TaskEventType.TASK_RUN;
}
export function isTaskClaimEvent(taskEvent: TaskEvent<unknown, unknown>): taskEvent is TaskClaim {
  return taskEvent.type === TaskEventType.TASK_CLAIM;
}
export function isTaskRunRequestEvent(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is TaskRunRequest {
  return taskEvent.type === TaskEventType.TASK_RUN_REQUEST;
}
export function isTaskPollingCycleEvent<T = string>(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is TaskPollingCycle<T> {
  return taskEvent.type === TaskEventType.TASK_POLLING_CYCLE;
}
export function isTaskManagerStatEvent(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is TaskManagerStat {
  return taskEvent.type === TaskEventType.TASK_MANAGER_STAT;
}
