/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import {
  RuleExecutionStatus,
  RuleExecutionStatusValues,
  RuleExecutionStatusWarningReasons,
  RawRuleExecutionStatus,
  RuleExecutionState,
} from '../types';
import { getReasonFromError } from './error_with_reason';
import { getEsErrorMessage } from './errors';
import { RuleExecutionStatuses } from '../../common';
import { translations } from '../constants/translations';
import { ActionsCompletion } from '../task_runner/types';

export function executionStatusFromState(state: RuleExecutionState): RuleExecutionStatus {
  const alertIds = Object.keys(state.alertInstances ?? {});

  const hasIncompleteAlertExecution =
    state.alertExecutionMetrics.triggeredActionsStatus === ActionsCompletion.PARTIAL;

  let status: RuleExecutionStatuses =
    alertIds.length === 0 ? RuleExecutionStatusValues[0] : RuleExecutionStatusValues[1];

  if (hasIncompleteAlertExecution) {
    status = RuleExecutionStatusValues[5];
  }

  return {
    metrics: state.metrics,
    numberOfTriggeredActions: state.alertExecutionMetrics.numberOfTriggeredActions,
    numberOfScheduledActions: state.alertExecutionMetrics.numberOfScheduledActions,
    lastExecutionDate: new Date(),
    status,
    ...(hasIncompleteAlertExecution && {
      warning: {
        reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
        message: translations.taskRunner.warning.maxExecutableActions,
      },
    }),
  };
}

export function executionStatusFromError(error: Error): RuleExecutionStatus {
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
  lastExecutionDate,
  lastDuration,
  status,
  error,
  warning,
}: RuleExecutionStatus): RawRuleExecutionStatus {
  return {
    lastExecutionDate: lastExecutionDate.toISOString(),
    lastDuration: lastDuration ?? 0,
    status,
    // explicitly setting to null (in case undefined) due to partial update concerns
    error: error ?? null,
    warning: warning ?? null,
  };
}

export function ruleExecutionStatusFromRaw(
  logger: Logger,
  ruleId: string,
  rawRuleExecutionStatus?: Partial<RawRuleExecutionStatus> | null | undefined
): RuleExecutionStatus | undefined {
  if (!rawRuleExecutionStatus) return undefined;

  const {
    lastExecutionDate,
    lastDuration,
    status = 'unknown',
    error,
    warning,
  } = rawRuleExecutionStatus;

  let parsedDateMillis = lastExecutionDate ? Date.parse(lastExecutionDate) : Date.now();
  if (isNaN(parsedDateMillis)) {
    logger.debug(
      `invalid ruleExecutionStatus lastExecutionDate "${lastExecutionDate}" in raw rule ${ruleId}`
    );
    parsedDateMillis = Date.now();
  }

  const executionStatus: RuleExecutionStatus = {
    status,
    lastExecutionDate: new Date(parsedDateMillis),
  };

  if (null != lastDuration) {
    executionStatus.lastDuration = lastDuration;
  }

  if (error) {
    executionStatus.error = error;
  }

  if (warning) {
    executionStatus.warning = warning;
  }

  return executionStatus;
}

export const getRuleExecutionStatusPending = (lastExecutionDate: string) => ({
  status: 'pending' as RuleExecutionStatuses,
  lastExecutionDate,
  error: null,
  warning: null,
});
