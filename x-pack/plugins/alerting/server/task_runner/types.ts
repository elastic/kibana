/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import {
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  IntervalSchedule,
  RuleAction,
  RuleMonitoring,
  RuleTaskState,
} from '../../common';
import { Alert } from '../alert';
import { RulesClientApi } from '../types';
import { RuleRunMetrics, RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';

export interface RuleTaskRunResult {
  state: RuleTaskState;
  monitoring: RuleMonitoring | undefined;
  schedule: IntervalSchedule | undefined;
}

// This is the state of the alerting task after rule execution, which includes run metrics plus the task state
export type RuleTaskStateAndMetrics = RuleTaskState & {
  metrics: RuleRunMetrics;
  actions: Array<Omit<RuleAction, 'id' | 'ref'>>;
};

export type RuleRunResult = Pick<RuleTaskRunResult, 'monitoring' | 'schedule'> & {
  rulesClient: RulesClientApi;
  stateWithMetrics: RuleTaskStateAndMetrics;
};

export interface RuleTaskInstance extends ConcreteTaskInstance {
  state: RuleTaskState;
}

export interface GenerateNewAndRecoveredAlertEventsParams<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  alertingEventLogger: AlertingEventLogger;
  newAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  ruleLabel: string;
  ruleRunMetricsStore: RuleRunMetricsStore;
}

export interface ScheduleActionsForRecoveredAlertsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  recoveryActionGroup: ActionGroup<RecoveryActionGroupId>;
  recoveredAlerts: Record<string, Alert<InstanceState, InstanceContext, RecoveryActionGroupId>>;
  mutedAlertIdsSet: Set<string>;
  ruleLabel: string;
  ruleRunMetricsStore: RuleRunMetricsStore;
  updatedAt: Date;
  allAlerts: Alert[];
}

export interface LogActiveAndRecoveredAlertsParams<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  ruleLabel: string;
  canSetRecoveryContext: boolean;
}
