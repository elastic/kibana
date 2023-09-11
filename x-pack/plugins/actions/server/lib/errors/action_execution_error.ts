/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeExecutorResult } from '../../types';

export enum ActionExecutionErrorReason {
  Validation = 'validation',
  Authorization = 'authorization',
}

export class ActionExecutionError extends Error {
  public readonly reason: ActionExecutionErrorReason;
  public readonly result: ActionTypeExecutorResult<unknown>;

  constructor(
    message: string,
    reason: ActionExecutionErrorReason,
    result: ActionTypeExecutorResult<unknown>
  ) {
    super(message);
    this.reason = reason;
    this.result = result;
  }
}
