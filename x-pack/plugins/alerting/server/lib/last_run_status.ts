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
  RuleExecutionStatusWarningReasons,
  RawRuleLastRun,
  RuleLastRun,
} from '../types';
import { translations } from '../constants/translations';
import { RuleRunMetrics } from './rule_run_metrics_store';

export interface ILastRun {
  lastRun: RuleLastRun;
  metrics: RuleRunMetrics | null;
}

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
      alertsCount: {
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
      warning: getReasonFromError(error),
      outcomeMsg: getEsErrorMessage(error),
      alertsCount: {},
    },
    metrics: null,
  };
};

export const lastRunToRaw = (lastRun: ILastRun['lastRun']): RawRuleLastRun => {
  const { warning, alertsCount, outcomeMsg } = lastRun;

  return {
    ...lastRun,
    alertsCount: {
      active: alertsCount.active || 0,
      new: alertsCount.new || 0,
      recovered: alertsCount.recovered || 0,
      ignored: alertsCount.ignored || 0,
    },
    warning: warning ?? null,
    outcomeMsg: outcomeMsg ?? null,
  };
};
