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
  experimental,
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
    messages: messages ?? [],
    error: error ?? null,
    experimental: experimental ?? null,
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

  const { delay, duration, instances, searchDuration, indexDuration, messages, experimental } =
    rawAlertExecutionStatus;

  const { noData, ruleStatus, ruleStatusOrder, gapDuration } = experimental ?? {};

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

  if (messages != null) {
    executionStatus.messages = messages;
  }

  if (error) {
    executionStatus.error = error;
  }

  if (experimental) {
    executionStatus.experimental = {};

    if (noData != null) {
      executionStatus.experimental.noData = noData;
    }

    if (ruleStatus != null) {
      executionStatus.experimental.ruleStatus = ruleStatus;
    }

    if (ruleStatusOrder != null) {
      executionStatus.experimental.ruleStatusOrder = ruleStatusOrder;
    }

    if (gapDuration != null) {
      executionStatus.experimental.gapDuration = gapDuration;
    }
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
  let { searchDuration, indexDuration, messages, experimental } = typeExecutionStatus;

  if (searchDuration === undefined) searchDuration = null;
  if (indexDuration === undefined) indexDuration = null;
  if (messages == null) messages = [];

  if (experimental == null) {
    experimental = null;
  } else {
    let { noData, ruleStatus, ruleStatusOrder, gapDuration } = experimental;
    if (noData === undefined) noData = null;
    if (ruleStatus === undefined) ruleStatus = null;
    if (ruleStatusOrder === undefined) ruleStatusOrder = null;
    if (gapDuration === undefined) gapDuration = null;
    experimental = { noData, ruleStatus, ruleStatusOrder, gapDuration };
  }

  return { searchDuration, indexDuration, messages, experimental };
}
