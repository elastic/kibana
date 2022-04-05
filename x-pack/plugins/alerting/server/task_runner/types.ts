/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dictionary } from 'lodash';
import { KibanaRequest, Logger } from 'kibana/server';
import {
  ActionGroup,
  RuleAction,
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
  IntervalSchedule,
  RuleExecutionState,
  RuleMonitoring,
  RuleTaskParams,
  RuleTaskState,
  SanitizedRule,
} from '../../common';
import { ConcreteTaskInstance } from '../../../task_manager/server';
import { Alert } from '../alert';
import { IEventLogger } from '../../../event_log/server';
import { NormalizedRuleType } from '../rule_type_registry';
import { ExecutionHandler } from './create_execution_handler';
import { PluginStartContract as ActionsPluginStartContract } from '../../../actions/server';
import { RawRule } from '../types';

export interface RuleTaskRunResultWithActions {
  state: RuleExecutionState;
  monitoring: RuleMonitoring | undefined;
  schedule: IntervalSchedule | undefined;
}

export interface RuleTaskRunResult {
  state: RuleTaskState;
  monitoring: RuleMonitoring | undefined;
  schedule: IntervalSchedule | undefined;
}

export type RuleTaskInstance = ConcreteTaskInstance<RuleTaskState, RuleTaskParams>;

export interface TrackAlertDurationsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
> {
  originalAlerts: Dictionary<Alert<InstanceState, InstanceContext>>;
  currentAlerts: Dictionary<Alert<InstanceState, InstanceContext>>;
  recoveredAlerts: Dictionary<Alert<InstanceState, InstanceContext>>;
}

export interface GenerateNewAndRecoveredAlertEventsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
> {
  eventLogger: IEventLogger;
  executionId: string;
  originalAlerts: Dictionary<Alert<InstanceState, InstanceContext>>;
  currentAlerts: Dictionary<Alert<InstanceState, InstanceContext>>;
  recoveredAlerts: Dictionary<Alert<InstanceState, InstanceContext>>;
  ruleId: string;
  ruleLabel: string;
  namespace: string | undefined;
  ruleType: NormalizedRuleType<
    RuleTypeParams,
    RuleTypeParams,
    RuleTypeState,
    {
      [x: string]: unknown;
    },
    {
      [x: string]: unknown;
    },
    string,
    string
  >;
  rule: SanitizedRule<RuleTypeParams>;
  spaceId: string;
}

export interface ScheduleActionsForRecoveredAlertsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  recoveryActionGroup: ActionGroup<RecoveryActionGroupId>;
  recoveredAlerts: Dictionary<Alert<InstanceState, InstanceContext, RecoveryActionGroupId>>;
  executionHandler: ExecutionHandler<RecoveryActionGroupId | RecoveryActionGroupId>;
  mutedAlertIdsSet: Set<string>;
  ruleLabel: string;
  alertExecutionStore: AlertExecutionStore;
}

export interface LogActiveAndRecoveredAlertsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  activeAlerts: Dictionary<Alert<InstanceState, InstanceContext, ActionGroupIds>>;
  recoveredAlerts: Dictionary<Alert<InstanceState, InstanceContext, RecoveryActionGroupId>>;
  ruleLabel: string;
  canSetRecoveryContext: boolean;
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
  eventLogger: IEventLogger;
  request: KibanaRequest;
  ruleParams: RuleTypeParams;
  supportsEphemeralTasks: boolean;
  maxEphemeralActionsPerRule: number;
  isEphemeralRule: boolean;
}

export interface ExecutionHandlerOptions<ActionGroupIds extends string> {
  actionGroup: ActionGroupIds;
  actionSubgroup?: string;
  alertId: string;
  context: AlertInstanceContext;
  state: AlertInstanceState;
  alertExecutionStore: AlertExecutionStore;
}

export enum ActionsCompletion {
  COMPLETE = 'complete',
  PARTIAL = 'partial',
}

export interface AlertExecutionStore {
  numberOfTriggeredActions: number;
  numberOfScheduledActions: number;
  triggeredActionsStatus: ActionsCompletion;
}
