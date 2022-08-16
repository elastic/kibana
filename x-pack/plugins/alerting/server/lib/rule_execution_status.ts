/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import {
  RuleExecutionStatus,
  RuleExecutionStatusValues,
  RuleExecutionStatusWarningReasons,
  RawRuleExecutionStatus,
} from '../types';
import { getReasonFromError } from './error_with_reason';
import { getEsErrorMessage } from './errors';
import { ActionsCompletion, RuleExecutionStatuses } from '../../common';
import { translations } from '../constants/translations';
import { RuleTaskStateAndMetrics } from '../task_runner/types';
import { RuleRunMetrics } from './rule_run_metrics_store';

export interface IExecutionStatusAndMetrics {
  status: RuleExecutionStatus;
  metrics: RuleRunMetrics | null;
}

export function executionStatusFromState(
  stateWithMetrics: RuleTaskStateAndMetrics,
  lastExecutionDate?: Date
): IExecutionStatusAndMetrics {
  const alertIds = Object.keys(stateWithMetrics.alertInstances ?? {});

  let status: RuleExecutionStatuses =
    alertIds.length === 0 ? RuleExecutionStatusValues[0] : RuleExecutionStatusValues[1];

  // Check for warning states
  let warning = null;
  // We only have a single warning field so prioritizing the alert circuit breaker over the actions circuit breaker
  if (stateWithMetrics.metrics.hasReachedAlertLimit) {
    status = RuleExecutionStatusValues[5];
    warning = {
      reason: RuleExecutionStatusWarningReasons.MAX_ALERTS,
      message: translations.taskRunner.warning.maxAlerts,
    };
  } else if (stateWithMetrics.metrics.triggeredActionsStatus === ActionsCompletion.PARTIAL) {
    status = RuleExecutionStatusValues[5];
    warning = {
      reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
      message: translations.taskRunner.warning.maxExecutableActions,
    };
  }

  return {
    status: {
      lastExecutionDate: lastExecutionDate ?? new Date(),
      status,
      ...(warning ? { warning } : {}),
    },
    metrics: stateWithMetrics.metrics,
  };
}

export function executionStatusFromError(
  error: Error,
  lastExecutionDate?: Date
): IExecutionStatusAndMetrics {
  return {
    status: {
      lastExecutionDate: lastExecutionDate ?? new Date(),
      status: 'error',
      error: {
        reason: getReasonFromError(error),
        message: getEsErrorMessage(error),
      },
    },
    metrics: null,
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
