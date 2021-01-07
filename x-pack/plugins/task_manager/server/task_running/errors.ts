/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Unrecoverable
const CODE_UNRECOVERABLE = 'TaskManager/unrecoverable';

const code = Symbol('TaskManagerErrorCode');

export interface DecoratedError extends Error {
  [code]?: string;
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
