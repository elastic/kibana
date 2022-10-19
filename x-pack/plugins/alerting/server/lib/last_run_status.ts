/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTaskStateAndMetrics } from '../task_runner/types';
import { getReasonFromError } from './error_with_reason';
import { getEsErrorMessage } from './errors';
import { ActionsCompletion } from '../../common';
import {
  RuleLastRunOutcomeValues,
  RuleLastRunOutcomes,
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
  RawRuleLastRun,
} from '../types';
import { translations } from '../constants/translations';
import { RuleRunMetrics } from './rule_run_metrics_store';

export interface ILastRun {
  lastRun: {
    outcome: RuleLastRunOutcomes;
    warning?: RuleExecutionStatusErrorReasons | RuleExecutionStatusWarningReasons;
    outcome_msg?: string;
    alerts_count: {
      active: number;
      new: number;
      recovered: number;
      ignored: number;
    };
  };
  metrics: RuleRunMetrics | null;
}

export const getInitialAlertsCount = () => ({
  active: 0,
  new: 0,
  recovered: 0,
  ignored: 0,
});

export const lastRunFromState = (stateWithMetrics: RuleTaskStateAndMetrics): ILastRun => {
  const { metrics } = stateWithMetrics;
  let outcome: RuleLastRunOutcomes = RuleLastRunOutcomeValues[0];
  // Check for warning states
  let warning = null;
  let outcomeMsg = null;

  // We only have a single warning field so prioritizing the alert circuit breaker over the actions circuit breaker
  if (metrics.hasReachedAlertLimit) {
    outcome = RuleLastRunOutcomeValues[1];
    warning = RuleExecutionStatusWarningReasons.MAX_ALERTS;
    outcomeMsg = translations.taskRunner.warning.maxAlerts;
  } else if (metrics.triggeredActionsStatus === ActionsCompletion.PARTIAL) {
    outcome = RuleLastRunOutcomeValues[1];
    warning = RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS;
    outcomeMsg = translations.taskRunner.warning.maxExecutableActions;
  }

  return {
    lastRun: {
      outcome,
      alerts_count: {
        active: metrics.numberOfActiveAlerts,
        new: metrics.numberOfNewAlerts,
        recovered: metrics.numberOfRecoveredAlerts,
        ignored: 0,
      },
      ...(warning ? { warning } : {}),
      ...(outcomeMsg ? { outcome_msg: outcomeMsg } : {}),
    },
    metrics,
  };
};

export const lastRunFromError = (error: Error): ILastRun => {
  return {
    lastRun: {
      outcome: RuleLastRunOutcomeValues[2],
      alerts_count: getInitialAlertsCount(),
      warning: getReasonFromError(error),
      outcome_msg: getEsErrorMessage(error),
    },
    metrics: null,
  };
};

export const lastRunToRaw = (lastRun: ILastRun['lastRun']): RawRuleLastRun => {
  const { warning, alerts_count: alertsCount, outcome_msg: outcomeMsg } = lastRun;

  return {
    ...lastRun,
    alerts_count: {
      active: alertsCount.active || 0,
      new: alertsCount.new || 0,
      recovered: alertsCount.recovered || 0,
      ignored: alertsCount.ignored || 0,
    },
    warning: warning ?? null,
    outcome_msg: outcomeMsg ?? null,
  };
};
