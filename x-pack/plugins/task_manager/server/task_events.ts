/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Option } from 'fp-ts/lib/Option';

import { ConcreteTaskInstance } from './task';

import { Result, Err } from './lib/result_type';
import { FillPoolResult } from './lib/fill_pool';
import { PollingError } from './polling';
import { TaskRunResult } from './task_running';

export enum TaskEventType {
  TASK_CLAIM = 'TASK_CLAIM',
  TASK_MARK_RUNNING = 'TASK_MARK_RUNNING',
  TASK_RUN = 'TASK_RUN',
  TASK_RUN_REQUEST = 'TASK_RUN_REQUEST',
  TASK_POLLING_CYCLE = 'TASK_POLLING_CYCLE',
}

export interface TaskTiming {
  start: number;
  stop: number;
}

export function startTaskTimer(): () => TaskTiming {
  const start = Date.now();
  return () => ({ start, stop: Date.now() });
}

export interface TaskEvent<T, E> {
  id?: string;
  timing?: TaskTiming;
  type: TaskEventType;
  event: Result<T, E>;
}
export interface RanTask {
  task: ConcreteTaskInstance;
  result: TaskRunResult;
}
export type ErroredTask = RanTask & {
  error: Error;
};

export type TaskMarkRunning = TaskEvent<ConcreteTaskInstance, Error>;
export type TaskRun = TaskEvent<RanTask, ErroredTask>;
export type TaskClaim = TaskEvent<ConcreteTaskInstance, Option<ConcreteTaskInstance>>;
export type TaskRunRequest = TaskEvent<ConcreteTaskInstance, Error>;
export type TaskPollingCycle<T = string> = TaskEvent<FillPoolResult, PollingError<T>>;

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
  event: Result<ConcreteTaskInstance, Option<ConcreteTaskInstance>>,
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
  event: Result<FillPoolResult, PollingError<T>>,
  timing?: TaskTiming
): TaskPollingCycle<T> {
  return {
    type: TaskEventType.TASK_POLLING_CYCLE,
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
