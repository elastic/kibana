/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchServiceStart,
  ExecutionContextStart,
  IBasePath,
  KibanaRequest,
  Logger,
  SavedObjectsServiceStart,
  UiSettingsServiceStart,
} from '@kbn/core/server';
import { ConcreteTaskInstance, DecoratedError } from '@kbn/task-manager-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server/actions_client';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { IEventLogger } from '@kbn/event-log-plugin/server';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { IAlertsClient } from '../alerts_client/types';
import { Alert } from '../alert';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  IntervalSchedule,
  RuleMonitoring,
  RuleTaskState,
  SanitizedRule,
  RuleTypeState,
  RuleAction,
  RuleAlertData,
} from '../../common';
import { NormalizedRuleType } from '../rule_type_registry';
import {
  RawRule,
  RulesClientApi,
  CombinedSummarizedAlerts,
  MaintenanceWindowClientApi,
  RulesSettingsClientApi,
  RuleTypeRegistry,
  SpaceIdToNamespaceFunction,
} from '../types';
import { RuleRunMetrics, RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { AlertsService } from '../alerts_service';
import { ActionsConfigMap } from '../lib/get_actions_config_map';
import { BackfillClient } from '../backfill_client/backfill_client';

export interface RuleTaskRunResult {
  state: RuleTaskState;
  monitoring: RuleMonitoring | undefined;
  schedule: IntervalSchedule | undefined;
  taskRunError?: DecoratedError;
}

// This is the state of the alerting task after rule execution, which includes run metrics plus the task state
export type RuleTaskStateAndMetrics = RuleTaskState & {
  metrics: RuleRunMetrics;
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
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
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
  previousStartedAt: Date | null;
  actionsClient: PublicMethodsOf<ActionsClient>;
  maintenanceWindowIds?: string[];
  alertsClient: IAlertsClient<AlertData, State, Context, ActionGroupIds, RecoveryActionGroupId>;
}

export type Executable<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> = {
  action: RuleAction;
} & (
  | {
      alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>;
      summarizedAlerts?: never;
    }
  | {
      alert?: never;
      summarizedAlerts: CombinedSummarizedAlerts;
    }
);

export interface TaskRunnerContext {
  logger: Logger;
  data: DataPluginStart;
  dataViews: DataViewsPluginStart;
  share: SharePluginStart;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  getRulesClientWithRequest(request: KibanaRequest): RulesClientApi;
  actionsPlugin: ActionsPluginStartContract;
  eventLogger: IEventLogger;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  executionContext: ExecutionContextStart;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  basePathService: IBasePath;
  ruleTypeRegistry: RuleTypeRegistry;
  alertsService: AlertsService | null;
  kibanaBaseUrl: string | undefined;
  supportsEphemeralTasks: boolean;
  maxEphemeralActionsPerRule: number;
  maxAlerts: number;
  actionsConfigMap: ActionsConfigMap;
  cancelAlertsOnRuleTimeout: boolean;
  usageCounter?: UsageCounter;
  backfillClient: BackfillClient;
  getRulesSettingsClientWithRequest(request: KibanaRequest): RulesSettingsClientApi;
  getMaintenanceWindowClientWithRequest(request: KibanaRequest): MaintenanceWindowClientApi;
}
