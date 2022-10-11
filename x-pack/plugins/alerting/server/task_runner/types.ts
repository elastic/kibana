/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import {
  ActionGroup,
  RuleAction,
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
  IntervalSchedule,
  RuleMonitoring,
  RuleTaskState,
  SanitizedRule,
} from '../../common';
import { Alert } from '../alert';
import { NormalizedRuleType } from '../rule_type_registry';
import { ExecutionHandler } from './create_execution_handler';
import { RawRule, RulesClientApi } from '../types';
import { ActionsConfigMap } from '../lib/get_actions_config_map';
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
};

export type RuleRunResult = Pick<RuleTaskRunResult, 'monitoring' | 'schedule'> & {
  rulesClient: RulesClientApi;
  stateWithMetrics: RuleTaskStateAndMetrics;
};

export interface RunRuleParams<Params extends RuleTypeParams> {
  fakeRequest: KibanaRequest;
  rulesClient: RulesClientApi;
  rule: SanitizedRule<Params>;
  apiKey: RawRule['apiKey'];
  validatedParams: Params;
}

export interface RuleTaskInstance extends ConcreteTaskInstance {
  state: RuleTaskState;
}

export interface ScheduleActionsForAlertsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  recoveryActionGroup: ActionGroup<RecoveryActionGroupId>;
  recoveredAlerts: Record<string, Alert<InstanceState, InstanceContext, RecoveryActionGroupId>>;
  executionHandler: ExecutionHandler<ActionGroupIds | RecoveryActionGroupId>;
  mutedAlertIdsSet: Set<string>;
  ruleLabel: string;
  ruleRunMetricsStore: RuleRunMetricsStore;
  activeAlerts: Record<string, Alert<InstanceState, InstanceContext, ActionGroupIds>>;
  throttle: string | null;
  notifyWhen: string | null;
}

// / ExecutionHandler

export interface CreateExecutionHandlerOptions<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  State extends RuleTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  ruleId: string;
  ruleName: string;
  ruleConsumer: string;
  executionId: string;
  tags?: string[];
  actionsPlugin: ActionsPluginStartContract;
  actions: RuleAction[];
  spaceId: string;
  apiKey: RawRule['apiKey'];
  kibanaBaseUrl: string | undefined;
  ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
  logger: Logger;
  alertingEventLogger: PublicMethodsOf<AlertingEventLogger>;
  request: KibanaRequest;
  ruleParams: RuleTypeParams;
  supportsEphemeralTasks: boolean;
  maxEphemeralActionsPerRule: number;
  actionsConfigMap: ActionsConfigMap;
}

export interface ExecutionHandlerOptions<ActionGroupIds extends string> {
  actionGroup: ActionGroupIds;
  alertId: string;
  context: AlertInstanceContext;
  state: AlertInstanceState;
  ruleRunMetricsStore: RuleRunMetricsStore;
}
