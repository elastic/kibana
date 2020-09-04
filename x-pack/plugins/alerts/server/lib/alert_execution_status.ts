/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertTaskState, AlertExecutionStatus, RawAlertExecutionStatus } from '../types';
import { getReasonFromError } from './error_with_reason';

export function executionStatusFromState(state: AlertTaskState): AlertExecutionStatus {
  const instanceIds = Object.keys(state.alertInstances ?? {});
  return {
    date: new Date(),
    status: instanceIds.length === 0 ? 'ok' : 'active',
  };
}

export function executionStatusFromError(error: Error): AlertExecutionStatus {
  return {
    date: new Date(),
    status: 'error',
    error: {
      reason: getReasonFromError(error),
      message: error.message,
    },
  };
}

export function alertExecutionStatusToRaw({
  date,
  status,
  error,
}: AlertExecutionStatus): RawAlertExecutionStatus {
  return {
    date: date.toISOString(),
    status,
    error: error ?? null,
  };
}

export function alertExecutionStatusFromRaw(
  rawAlertExecutionStatus?: Partial<RawAlertExecutionStatus> | null | undefined
): AlertExecutionStatus | undefined {
  if (!rawAlertExecutionStatus) return undefined;

  const { date, status = 'unknown', error } = rawAlertExecutionStatus;

  let parsedDateMillis = date ? Date.parse(date) : Date.now();
  if (isNaN(parsedDateMillis)) {
    // TODO: log a message?
    parsedDateMillis = Date.now();
  }

  const parsedDate = new Date(parsedDateMillis);
  if (error) {
    return { date: parsedDate, status, error };
  } else {
    return { date: parsedDate, status };
  }
}
