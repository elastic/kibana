/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dictionary } from 'lodash';
import { Logger } from 'kibana/server';
import {
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
  IntervalSchedule,
  RuleExecutionState,
  RuleMonitoring,
  RuleTaskState,
  SanitizedAlert,
} from '../../common';
import { ConcreteTaskInstance } from '../../../task_manager/server';
import { Alert as CreatedAlert } from '../alert';
import { IEventLogger } from '../../../event_log/server';
import { NormalizedRuleType } from '../rule_type_registry';
import { ExecutionHandler } from './create_execution_handler';

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

export interface RuleTaskInstance extends ConcreteTaskInstance {
  state: RuleTaskState;
}

export interface TrackAlertDurationsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
> {
  originalAlerts: Dictionary<CreatedAlert<InstanceState, InstanceContext>>;
  currentAlerts: Dictionary<CreatedAlert<InstanceState, InstanceContext>>;
  recoveredAlerts: Dictionary<CreatedAlert<InstanceState, InstanceContext>>;
}

export interface GenerateNewAndRecoveredAlertEventsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
> {
  eventLogger: IEventLogger;
  executionId: string;
  originalAlerts: Dictionary<CreatedAlert<InstanceState, InstanceContext>>;
  currentAlerts: Dictionary<CreatedAlert<InstanceState, InstanceContext>>;
  recoveredAlerts: Dictionary<CreatedAlert<InstanceState, InstanceContext>>;
  ruleId: string;
  ruleLabel: string;
  namespace: string | undefined;
  ruleType: NormalizedRuleType<
    AlertTypeParams,
    AlertTypeParams,
    AlertTypeState,
    {
      [x: string]: unknown;
    },
    {
      [x: string]: unknown;
    },
    string,
    string
  >;
  rule: SanitizedAlert<AlertTypeParams>;
}

export interface ScheduleActionsForRecoveredAlertsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  recoveryActionGroup: ActionGroup<RecoveryActionGroupId>;
  recoveredAlerts: Dictionary<CreatedAlert<InstanceState, InstanceContext, RecoveryActionGroupId>>;
  executionHandler: ExecutionHandler<RecoveryActionGroupId | RecoveryActionGroupId>;
  mutedAlertIdsSet: Set<string>;
  ruleLabel: string;
}

export interface LogActiveAndRecoveredAlertsParams<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  activeAlerts: Dictionary<CreatedAlert<InstanceState, InstanceContext, ActionGroupIds>>;
  recoveredAlerts: Dictionary<CreatedAlert<InstanceState, InstanceContext, RecoveryActionGroupId>>;
  ruleLabel: string;
  canSetRecoveryContext: boolean;
}
