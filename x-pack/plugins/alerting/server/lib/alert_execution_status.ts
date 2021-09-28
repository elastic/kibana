/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import {
  AlertTaskState,
  AlertExecutionStatus,
  AlertTypeExecutionStatus,
  RawAlertExecutionStatus,
} from '../types';
import { getReasonFromError } from './error_with_reason';
import { getEsErrorMessage } from './errors';
import { AlertExecutionStatuses } from '../../common';

export function setExecutionStatusFromState(
  executionStatus: Partial<AlertExecutionStatus>,
  state: AlertTaskState
): void {
  const instanceIds = Object.keys(state.alertInstances ?? {});
  executionStatus.status = instanceIds.length === 0 ? 'ok' : 'active';
}

export function setExecutionStatusFromError(
  executionStatus: Partial<AlertExecutionStatus>,
  error: Error
): void {
  executionStatus.status = 'error';
  executionStatus.error = {
    reason: getReasonFromError(error),
    message: getEsErrorMessage(error),
  };
}

export function alertExecutionStatusToRaw({
  lastExecutionDate = new Date(),
  status = 'unknown',
  error,
  delay,
  duration,
  searchDuration,
  indexDuration,
  instances,
  noData,
  messages,
}: Partial<AlertExecutionStatus>): RawAlertExecutionStatus {
  // explicitly using null (in case undefined) due to partial update concerns
  return {
    lastExecutionDate: lastExecutionDate.toISOString(),
    status,
    delay: delay ?? 0,
    duration: duration ?? 0,
    searchDuration: searchDuration ?? null,
    indexDuration: indexDuration ?? null,
    instances: instances ?? null,
    noData: noData ?? false,
    messages: messages ?? [],
    error: error ?? null,
  };
}

export function alertExecutionStatusFromRaw(
  logger: Logger,
  alertId: string,
  rawAlertExecutionStatus?: Partial<RawAlertExecutionStatus> | null | undefined
): AlertExecutionStatus | undefined {
  if (!rawAlertExecutionStatus) return undefined;

  const { lastExecutionDate, status = 'unknown', error } = rawAlertExecutionStatus;

  let parsedDateMillis = lastExecutionDate ? Date.parse(lastExecutionDate) : Date.now();
  if (isNaN(parsedDateMillis)) {
    logger.debug(
      `invalid alertExecutionStatus lastExecutionDate "${lastExecutionDate}" in raw alert ${alertId}`
    );
    parsedDateMillis = Date.now();
  }

  const parsedDate = new Date(parsedDateMillis);

  const { delay, duration, instances, searchDuration, indexDuration, noData, messages } =
    rawAlertExecutionStatus;

  const executionStatus: AlertExecutionStatus = {
    status,
    lastExecutionDate: parsedDate,
  };

  if (delay !== undefined) {
    executionStatus.delay = delay;
  }

  if (duration !== undefined) {
    executionStatus.duration = duration;
  }

  if (searchDuration != null) {
    executionStatus.searchDuration = searchDuration;
  }

  if (indexDuration != null) {
    executionStatus.indexDuration = indexDuration;
  }

  if (instances != null) {
    executionStatus.instances = instances;
  }

  if (noData != null) {
    executionStatus.noData = noData;
  }

  if (messages != null) {
    executionStatus.messages = messages;
  }

  if (error) {
    executionStatus.error = error;
  }

  return executionStatus;
}

export const getAlertExecutionStatusPending = (lastExecutionDate: string) => ({
  status: 'pending' as AlertExecutionStatuses,
  lastExecutionDate,
  error: null,
});

export function normalizeAlertTypeExecutionStatus(
  typeExecutionStatus: AlertTypeExecutionStatus = {}
): AlertTypeExecutionStatus {
  let { searchDuration, indexDuration, noData, messages } = typeExecutionStatus;

  if (searchDuration === undefined) searchDuration = null;
  if (indexDuration === undefined) indexDuration = null;
  if (noData === undefined) noData = false;
  if (messages == null) messages = [];

  return { searchDuration, indexDuration, noData, messages };
}
