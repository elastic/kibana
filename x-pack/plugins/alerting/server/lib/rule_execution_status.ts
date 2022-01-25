/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import { RuleTaskState, AlertExecutionStatus, RawRuleExecutionStatus } from '../types';
import { getReasonFromError } from './error_with_reason';
import { getEsErrorMessage } from './errors';
import { AlertExecutionStatuses } from '../../common';

export function executionStatusFromState(state: RuleTaskState): AlertExecutionStatus {
  const alertIds = Object.keys(state.alertInstances ?? {});
  return {
    numberOfTriggeredActions: state.triggeredActions?.length ?? 0,
    lastExecutionDate: new Date(),
    status: alertIds.length === 0 ? 'ok' : 'active',
  };
}

export function executionStatusFromError(error: Error): AlertExecutionStatus {
  return {
    lastExecutionDate: new Date(),
    status: 'error',
    error: {
      reason: getReasonFromError(error),
      message: getEsErrorMessage(error),
    },
  };
}

export function ruleExecutionStatusToRaw({
  numberOfTriggeredActions,
  lastExecutionDate,
  lastDuration,
  status,
  error,
}: AlertExecutionStatus): RawRuleExecutionStatus {
  return {
    numberOfTriggeredActions: numberOfTriggeredActions ?? 0,
    lastExecutionDate: lastExecutionDate.toISOString(),
    lastDuration: lastDuration ?? 0,
    status,
    // explicitly setting to null (in case undefined) due to partial update concerns
    error: error ?? null,
  };
}

export function ruleExecutionStatusFromRaw(
  logger: Logger,
  ruleId: string,
  rawRuleExecutionStatus?: Partial<RawRuleExecutionStatus> | null | undefined
): AlertExecutionStatus | undefined {
  if (!rawRuleExecutionStatus) return undefined;

  const {
    lastExecutionDate,
    lastDuration,
    numberOfTriggeredActions,
    status = 'unknown',
    error,
  } = rawRuleExecutionStatus;

  let parsedDateMillis = lastExecutionDate ? Date.parse(lastExecutionDate) : Date.now();
  if (isNaN(parsedDateMillis)) {
    logger.debug(
      `invalid ruleExecutionStatus lastExecutionDate "${lastExecutionDate}" in raw rule ${ruleId}`
    );
    parsedDateMillis = Date.now();
  }

  const executionStatus: AlertExecutionStatus = {
    status,
    lastExecutionDate: new Date(parsedDateMillis),
  };

  if (null != lastDuration) {
    executionStatus.lastDuration = lastDuration;
  }

  if (null != numberOfTriggeredActions) {
    executionStatus.numberOfTriggeredActions = numberOfTriggeredActions;
  }

  if (error) {
    executionStatus.error = error;
  }

  return executionStatus;
}

export const getRuleExecutionStatusPending = (lastExecutionDate: string) => ({
  status: 'pending' as AlertExecutionStatuses,
  lastExecutionDate,
  error: null,
});
