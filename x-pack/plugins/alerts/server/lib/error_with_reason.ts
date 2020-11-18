/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertExecutionStatusErrorReasons } from '../types';

export class ErrorWithReason extends Error {
  public readonly reason: AlertExecutionStatusErrorReasons;
  public readonly error: Error;

  constructor(reason: AlertExecutionStatusErrorReasons, error: Error) {
    super(error.message);
    this.error = error;
    this.reason = reason;
  }
}

export function getReasonFromError(error: Error): AlertExecutionStatusErrorReasons {
  if (isErrorWithReason(error)) {
    return error.reason;
  }
  return AlertExecutionStatusErrorReasons.Unknown;
}

export function isErrorWithReason(error: Error | ErrorWithReason): error is ErrorWithReason {
  return error instanceof ErrorWithReason;
}
