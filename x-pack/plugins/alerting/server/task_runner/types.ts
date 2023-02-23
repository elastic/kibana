/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server/actions_client';
import { TaskRunnerContext } from './task_runner_factory';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  IntervalSchedule,
  RuleMonitoring,
  RuleTaskState,
  SanitizedRule,
  RuleTypeState,
} from '../../common';
import { NormalizedRuleType } from '../rule_type_registry';
import { RawRule, RulesClientApi } from '../types';
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

// / ExecutionHandler

export interface ExecutionHandlerOptions<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
  logger: Logger;
  alertingEventLogger: PublicMethodsOf<AlertingEventLogger>;
  rule: SanitizedRule<Params>;
  taskRunnerContext: TaskRunnerContext;
  taskInstance: RuleTaskInstance;
  ruleRunMetricsStore: RuleRunMetricsStore;
  apiKey: RawRule['apiKey'];
  ruleConsumer: string;
  executionId: string;
  ruleLabel: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
}
