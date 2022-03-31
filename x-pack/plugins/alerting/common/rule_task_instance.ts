/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { rawAlertInstance } from './alert_instance';
import { DateFromString } from './date_from_string';
import { IntervalSchedule, RuleMonitoring } from './alert';

export enum ActionsCompletion {
  COMPLETE = 'complete',
  PARTIAL = 'partial',
}

export const ruleStateSchema = t.partial({
  alertTypeState: t.record(t.string, t.unknown),
  alertInstances: t.record(t.string, rawAlertInstance),
  previousStartedAt: t.union([t.null, DateFromString]),
});

const ruleExecutionActionsCompletion = t.union([
  t.literal(ActionsCompletion.COMPLETE),
  t.literal(ActionsCompletion.PARTIAL),
]);

const ruleExecutionMetricsSchema = t.type({
  numSearches: t.number,
  totalSearchDurationMs: t.number,
  esSearchDurationMs: t.number,
  numberOfTriggeredActions: t.number,
  numberOfScheduledActions: t.number,
  numberOfActiveAlerts: t.number,
  numberOfRecoveredAlerts: t.number,
  numberOfNewAlerts: t.number,
  triggeredActionsStatus: ruleExecutionActionsCompletion,
});

export type RuleExecutionMetrics = t.TypeOf<typeof ruleExecutionMetricsSchema>;

// This is serialized in the rule task document
export type RuleTaskState = t.TypeOf<typeof ruleStateSchema>;

// This is the task state plus additional metrics gathered during rule execution
export type RuleExecutionState = RuleTaskState & {
  metrics: RuleExecutionMetrics;
};

export const EMPTY_RULE_EXECUTION_METRICS: RuleExecutionMetrics = {
  numSearches: 0,
  totalSearchDurationMs: 0,
  esSearchDurationMs: 0,
  numberOfTriggeredActions: 0,
  numberOfScheduledActions: 0,
  numberOfActiveAlerts: 0,
  numberOfRecoveredAlerts: 0,
  numberOfNewAlerts: 0,
  triggeredActionsStatus: ActionsCompletion.COMPLETE,
};

export const EMPTY_RULE_EXECUTION_STATE: RuleExecutionState = {
  metrics: EMPTY_RULE_EXECUTION_METRICS,
};

export const ruleParamsSchema = t.intersection([
  t.type({
    alertId: t.string,
  }),
  t.partial({
    spaceId: t.string,
  }),
]);
export type RuleTaskParams = t.TypeOf<typeof ruleParamsSchema>;

export interface RuleExecutionRunResult {
  state: RuleExecutionState;
  monitoring: RuleMonitoring | undefined;
  schedule: IntervalSchedule | undefined;
}
