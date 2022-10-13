/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monitorEventLoopDelay } from 'perf_hooks';

import { Option } from 'fp-ts/lib/Option';

import { ConcreteTaskInstance } from './task';

import { Result, Err } from './lib/result_type';
import { ClaimAndFillPoolResult } from './lib/fill_pool';
import { PollingError } from './polling';
import { TaskRunResult } from './task_running';
import { EphemeralTaskInstanceRequest } from './ephemeral_task_lifecycle';
import type { EventLoopDelayConfig } from './config';

export enum TaskPersistence {
  Recurring = 'recurring',
  NonRecurring = 'non_recurring',
  Ephemeral = 'ephemeral',
}

export enum TaskEventType {
  TASK_CLAIM = 'TASK_CLAIM',
  TASK_MARK_RUNNING = 'TASK_MARK_RUNNING',
  TASK_RUN = 'TASK_RUN',
  TASK_RUN_REQUEST = 'TASK_RUN_REQUEST',
  TASK_POLLING_CYCLE = 'TASK_POLLING_CYCLE',
  TASK_MANAGER_STAT = 'TASK_MANAGER_STAT',
  EPHEMERAL_TASK_DELAYED_DUE_TO_CAPACITY = 'EPHEMERAL_TASK_DELAYED_DUE_TO_CAPACITY',
}

export enum TaskClaimErrorType {
  CLAIMED_BY_ID_OUT_OF_CAPACITY = 'CLAIMED_BY_ID_OUT_OF_CAPACITY',
  CLAIMED_BY_ID_NOT_RETURNED = 'CLAIMED_BY_ID_NOT_RETURNED',
  CLAIMED_BY_ID_NOT_IN_CLAIMING_STATUS = 'CLAIMED_BY_ID_NOT_IN_CLAIMING_STATUS',
}

export interface TaskTiming {
  start: number;
  stop: number;
  eventLoopBlockMs?: number;
}
export type WithTaskTiming<T> = T & { timing: TaskTiming };

export function startTaskTimer(): () => TaskTiming {
  const start = Date.now();
  return () => ({ start, stop: Date.now() });
}

export function startTaskTimerWithEventLoopMonitoring(
  eventLoopDelayConfig: EventLoopDelayConfig
): () => TaskTiming {
  const stopTaskTimer = startTaskTimer();
  const eldHistogram = eventLoopDelayConfig.monitor ? monitorEventLoopDelay() : null;
  eldHistogram?.enable();

  return () => {
    const { start, stop } = stopTaskTimer();
    eldHistogram?.disable();
    const eldMax = eldHistogram?.max ?? 0;
    const eventLoopBlockMs = Math.round(eldMax / 1000 / 1000); // original in nanoseconds
    return { start, stop, eventLoopBlockMs };
  };
}

export interface TaskEvent<OkResult, ErrorResult, ID = string> {
  id?: ID;
  timing?: TaskTiming;
  type: TaskEventType;
  event: Result<OkResult, ErrorResult>;
}
export interface RanTask {
  task: ConcreteTaskInstance;
  persistence: TaskPersistence;
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
export type EphemeralTaskRejectedDueToCapacity = TaskEvent<EphemeralTaskInstanceRequest, Error>;
export type TaskPollingCycle<T = string> = TaskEvent<ClaimAndFillPoolResult, PollingError<T>>;

export type TaskManagerStats =
  | 'load'
  | 'pollingDelay'
  | 'claimDuration'
  | 'queuedEphemeralTasks'
  | 'ephemeralTaskDelay';
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
  timing?: TaskTiming
): TaskMarkRunning {
  return {
    id,
    type: TaskEventType.TASK_MARK_RUNNING,
    event,
    timing,
  };
}

export function asTaskRunEvent(
  id: string,
  event: Result<RanTask, ErroredTask>,
  timing?: TaskTiming
): TaskRun {
  return {
    id,
    type: TaskEventType.TASK_RUN,
    event,
    timing,
  };
}

export function asTaskClaimEvent(
  id: string,
  event: Result<ConcreteTaskInstance, ClaimTaskErr>,
  timing?: TaskTiming
): TaskClaim {
  return {
    id,
    type: TaskEventType.TASK_CLAIM,
    event,
    timing,
  };
}

export function asTaskRunRequestEvent(
  id: string,
  // we only emit a TaskRunRequest event when it fails
  event: Err<Error>,
  timing?: TaskTiming
): TaskRunRequest {
  return {
    id,
    type: TaskEventType.TASK_RUN_REQUEST,
    event,
    timing,
  };
}

export function asTaskPollingCycleEvent<T = string>(
  event: Result<ClaimAndFillPoolResult, PollingError<T>>,
  timing?: TaskTiming
): TaskPollingCycle<T> {
  return {
    type: TaskEventType.TASK_POLLING_CYCLE,
    event,
    timing,
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

export function asEphemeralTaskRejectedDueToCapacityEvent(
  id: string,
  event: Result<EphemeralTaskInstanceRequest, Error>,
  timing?: TaskTiming
): EphemeralTaskRejectedDueToCapacity {
  return {
    id,
    type: TaskEventType.EPHEMERAL_TASK_DELAYED_DUE_TO_CAPACITY,
    event,
    timing,
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
export function isEphemeralTaskRejectedDueToCapacityEvent(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is EphemeralTaskRejectedDueToCapacity {
  return taskEvent.type === TaskEventType.EPHEMERAL_TASK_DELAYED_DUE_TO_CAPACITY;
}
