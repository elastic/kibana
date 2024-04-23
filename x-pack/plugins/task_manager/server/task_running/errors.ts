/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TaskErrorSource } from '../../common';
import { EphemeralTask } from '../task';

export { TaskErrorSource };

// Unrecoverable
const CODE_UNRECOVERABLE = 'TaskManager/unrecoverable';
const CODE_RETRYABLE = 'TaskManager/retryable';

const code = Symbol('TaskManagerErrorCode');
const retry = Symbol('TaskManagerErrorRetry');
const source = Symbol('TaskManagerErrorSource');

export interface DecoratedError extends Error {
  [code]?: string;
  [retry]?: Date | boolean;
  [source]?: TaskErrorSource;
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

function isTaskManagerError(error: unknown): error is DecoratedError {
  return Boolean(error && (error as DecoratedError)[code]);
}

export function isUnrecoverableError(error: Error | DecoratedError) {
  return isTaskManagerError(error) && error[code] === CODE_UNRECOVERABLE;
}

export function throwUnrecoverableError(error: Error) {
  (error as DecoratedError)[code] = CODE_UNRECOVERABLE;
  throw error;
}

export function isRetryableError(error: Error | DecoratedError) {
  if (isTaskManagerError(error) && error[code] === CODE_RETRYABLE) {
    return error[retry];
  }
  return null;
}

export function createRetryableError(error: Error, shouldRetry: Date | boolean): DecoratedError {
  (error as DecoratedError)[code] = CODE_RETRYABLE;
  (error as DecoratedError)[retry] = shouldRetry;
  return error;
}

export function throwRetryableError(error: Error, shouldRetry: Date | boolean) {
  throw createRetryableError(error, shouldRetry);
}

export function createTaskRunError(
  error: Error,
  errorSource = TaskErrorSource.FRAMEWORK
): DecoratedError {
  (error as DecoratedError)[source] = errorSource;
  return error;
}

function isTaskRunError(error: Error | DecoratedError): error is DecoratedError {
  return Boolean(error && (error as DecoratedError)[source]);
}

export function getErrorSource(error: Error | DecoratedError): TaskErrorSource | undefined {
  if (isTaskRunError(error) && error[source]) {
    return error[source];
  }
}

export function isUserError(error: Error | DecoratedError) {
  return getErrorSource(error) === TaskErrorSource.USER;
}

export function isEphemeralTaskRejectedDueToCapacityError(
  error: Error | EphemeralTaskRejectedDueToCapacityError
) {
  return Boolean(error && error instanceof EphemeralTaskRejectedDueToCapacityError);
}
