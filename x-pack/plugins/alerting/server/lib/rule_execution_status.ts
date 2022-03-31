/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import {
  AlertExecutionStatus,
  AlertExecutionStatusValues,
  AlertExecutionStatusWarningReasons,
  RawRuleExecutionStatus,
  RuleExecutionState,
} from '../types';
import { getReasonFromError } from './error_with_reason';
import { getEsErrorMessage } from './errors';
import {
  ActionsCompletion,
  AlertExecutionStatuses,
  EMPTY_RULE_EXECUTION_METRICS,
  RuleExecutionMetrics,
} from '../../common';
import { translations } from '../constants/translations';

export interface IExecutionStatusAndMetrics {
  status: AlertExecutionStatus;
  metrics: RuleExecutionMetrics;
}

export function executionStatusFromState(state: RuleExecutionState): IExecutionStatusAndMetrics {
  const alertIds = Object.keys(state.alertInstances ?? {});

  const hasIncompleteAlertExecution =
    state.metrics.triggeredActionsStatus === ActionsCompletion.PARTIAL;

  let status: AlertExecutionStatuses =
    alertIds.length === 0 ? AlertExecutionStatusValues[0] : AlertExecutionStatusValues[1];

  if (hasIncompleteAlertExecution) {
    status = AlertExecutionStatusValues[5];
  }

  return {
    status: {
      lastExecutionDate: new Date(),
      status,
      ...(hasIncompleteAlertExecution && {
        warning: {
          reason: AlertExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
          message: translations.taskRunner.warning.maxExecutableActions,
        },
      }),
    },
    metrics: state.metrics,
  };
}

export function executionStatusFromError(error: Error): IExecutionStatusAndMetrics {
  return {
    status: {
      lastExecutionDate: new Date(),
      status: 'error',
      error: {
        reason: getReasonFromError(error),
        message: getEsErrorMessage(error),
      },
    },
    metrics: EMPTY_RULE_EXECUTION_METRICS,
  };
}

export function ruleExecutionStatusToRaw({
  lastExecutionDate,
  lastDuration,
  status,
  error,
  warning,
}: AlertExecutionStatus): RawRuleExecutionStatus {
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
): AlertExecutionStatus | undefined {
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

  const executionStatus: AlertExecutionStatus = {
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
  status: 'pending' as AlertExecutionStatuses,
  lastExecutionDate,
  error: null,
  warning: null,
});
