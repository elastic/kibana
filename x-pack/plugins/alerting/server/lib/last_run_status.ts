/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTaskStateAndMetrics } from '../task_runner/types';
import { getReasonFromError } from './error_with_reason';
import { getEsErrorMessage } from './errors';
import { ActionsCompletion, RuleLastRunOutcomes } from '../../common';
import {
  RuleLastRunOutcomeValues,
  RuleExecutionStatusWarningReasons,
  RawRuleLastRun,
  RuleLastRun,
} from '../types';
import { translations } from '../constants/translations';
import { RuleRunMetrics } from './rule_run_metrics_store';
import { RuleResultService } from '../monitoring/rule_result_service';

export interface ILastRun {
  lastRun: RuleLastRun;
  metrics: RuleRunMetrics | null;
}

export const lastRunFromState = (
  stateWithMetrics: RuleTaskStateAndMetrics,
  ruleResultService: RuleResultService
): ILastRun => {
  let outcome: RuleLastRunOutcomes = RuleLastRunOutcomeValues[0];
  // Check for warning states
  let warning: RuleLastRun['warning'] = null;
  const outcomeMsg: string[] = [];

  const { errors, warnings, outcomeMessage } = ruleResultService.getLastRunResults();
  const { metrics } = stateWithMetrics;

  if (warnings.length > 0) {
    outcome = RuleLastRunOutcomeValues[1];
  }

  // We only have a single warning field so prioritizing the alert circuit breaker over the actions circuit breaker
  if (metrics.hasReachedAlertLimit) {
    outcome = RuleLastRunOutcomeValues[1];
    warning = RuleExecutionStatusWarningReasons.MAX_ALERTS;
    outcomeMsg.push(translations.taskRunner.warning.maxAlerts);
  } else if (metrics.triggeredActionsStatus === ActionsCompletion.PARTIAL) {
    outcome = RuleLastRunOutcomeValues[1];
    warning = RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS;
    outcomeMsg.push(translations.taskRunner.warning.maxExecutableActions);
  }

  // Overwrite outcome to be error if last run reported any errors
  if (errors.length > 0) {
    outcome = RuleLastRunOutcomeValues[2];
  }

  // Optionally push outcome message reported by
  // rule execution to the Framework's outcome message array
  if (outcomeMessage) {
    outcomeMsg.push(outcomeMessage);
  }

  // Overwrite outcome to be error if last run reported any errors
  if (errors.length > 0) {
    outcome = RuleLastRunOutcomeValues[2];
  }

  // Optionally merge outcome messages reported by
  // rule execution to the Framework's outcome message
  if (outcomeMsg.length > 0 && outcomeMessage.length > 0) {
    outcomeMsg = `${outcomeMsg} - ${outcomeMessage}`;
  } else if (outcomeMessage.length > 0) {
    outcomeMsg = outcomeMessage;
  }

  return {
    lastRun: {
      outcome,
      outcomeMsg: outcomeMsg.length > 0 ? outcomeMsg : null,
      warning: warning || null,
      alertsCount: {
        active: metrics.numberOfActiveAlerts,
        new: metrics.numberOfNewAlerts,
        recovered: metrics.numberOfRecoveredAlerts,
        ignored: 0,
      },
    },
    metrics,
  };
};

export const lastRunFromError = (error: Error): ILastRun => {
  const esErrorMessage = getEsErrorMessage(error);
  return {
    lastRun: {
      outcome: RuleLastRunOutcomeValues[2],
      warning: getReasonFromError(error),
      outcomeMsg: esErrorMessage ? [esErrorMessage] : null,
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
    outcomeMsg: outcomeMsg && !Array.isArray(outcomeMsg) ? [outcomeMsg] : outcomeMsg,
  };
};
