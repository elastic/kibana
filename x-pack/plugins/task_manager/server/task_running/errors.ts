/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EphemeralTask } from '../task';

// Unrecoverable
const CODE_UNRECOVERABLE = 'TaskManager/unrecoverable';
const CODE_RETRYABLE = 'TaskManager/retryable';
const CODE_SKIP = 'TaskManager/skip';

const code = Symbol('TaskManagerErrorCode');
const retry = Symbol('TaskManagerErrorRetry');

export enum TaskErrorSource {
  FRAMEWORK = 'framework',
  USER = 'user',
  RULE_TYPE = 'rule_type',
  CONNECTOR_TYPE = 'connector_type',
}

export interface TaskRunError extends Error {
  [code]?: string;
  [retry]?: Date | boolean;
  source?: TaskErrorSource;
}

export class EphemeralTaskRejectedDueToCapacityError extends Error {
  private _task: EphemeralTask;

  constructor(message: string, task: EphemeralTask) {
    super(message);
    this._task = task;
  }

  public get task() {
    return this._task;
  }
}

function isTaskManagerError(error: unknown): error is TaskRunError {
  return Boolean(error && (error as TaskRunError)[code]);
}

export function isUnrecoverableError(error: Error | TaskRunError) {
  return isTaskManagerError(error) && error[code] === CODE_UNRECOVERABLE;
}

export function throwUnrecoverableError(error: Error, errorSource = TaskErrorSource.FRAMEWORK) {
  (error as TaskRunError)[code] = CODE_UNRECOVERABLE;
  (error as TaskRunError).source = errorSource;
  throw error;
}

export function isRetryableError(error: Error | TaskRunError) {
  if (isTaskManagerError(error) && error[code] === CODE_RETRYABLE) {
    return error[retry];
  }
  return null;
}

// used only by Actions plugin
export function throwRetryableError(
  error: Error,
  shouldRetry: Date | boolean,
  errorSource = TaskErrorSource.FRAMEWORK
) {
  (error as TaskRunError)[code] = CODE_RETRYABLE;
  (error as TaskRunError)[retry] = shouldRetry;
  (error as TaskRunError).source = errorSource;
  throw error;
}

export function isSkipError(error: Error | TaskRunError) {
  if (isTaskManagerError(error) && error[code] === CODE_SKIP) {
    return true;
  }
  return false;
}

export function createSkipError(error: Error): TaskRunError {
  (error as TaskRunError)[code] = CODE_SKIP;
  return error;
}

export function createTaskRunError(
  error: Error,
  errorSource = TaskErrorSource.FRAMEWORK
): TaskRunError {
  (error as TaskRunError).source = errorSource;
  return error;
}

export function isEphemeralTaskRejectedDueToCapacityError(
  error: Error | EphemeralTaskRejectedDueToCapacityError
) {
  return Boolean(error && error instanceof EphemeralTaskRejectedDueToCapacityError);
}
