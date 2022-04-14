/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { rawAlertInstance } from './alert_instance';
import { DateFromString } from './date_from_string';
import { IntervalSchedule, RuleMonitoring } from './rule';

export const ruleStateSchema = t.partial({
  alertTypeState: t.record(t.string, t.unknown),
  alertInstances: t.record(t.string, rawAlertInstance),
  previousStartedAt: t.union([t.null, DateFromString]),
});

const ruleExecutionMetricsSchema = t.partial({
  numSearches: t.number,
  totalSearchDurationMs: t.number,
  esSearchDurationMs: t.number,
});

const alertExecutionStore = t.partial({
  numberOfTriggeredActions: t.number,
  numberOfScheduledActions: t.number,
  triggeredActionsStatus: t.string,
});

export type RuleExecutionMetrics = t.TypeOf<typeof ruleExecutionMetricsSchema>;
export type RuleTaskState = t.TypeOf<typeof ruleStateSchema>;
export type RuleExecutionState = RuleTaskState & {
  metrics: RuleExecutionMetrics;
  alertExecutionStore: t.TypeOf<typeof alertExecutionStore>;
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
