/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext, SavedObjectReference } from 'src/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { Dictionary } from 'lodash';
import {
  IScopedClusterClient,
  KibanaRequest,
  Logger,
  SavedObjectAttributes,
  SavedObjectsClientContract,
} from '../../../../src/core/server';
import { Alert as CreatedAlert, PublicAlert } from './alert';
import { NormalizedRuleType, RuleTypeRegistry as OrigruleTypeRegistry } from './rule_type_registry';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { RulesClient } from './rules_client';
export * from '../common';
import {
  Alert,
  AlertActionParams,
  ActionGroup,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceContext,
  AlertInstanceState,
  AlertExecutionStatuses,
  AlertExecutionStatusErrorReasons,
  AlertsHealth,
  AlertNotifyWhenType,
  WithoutReservedActionGroups,
  ActionVariable,
  SanitizedRuleConfig,
  RuleMonitoring,
  RuleTaskStateWithActions,
  IntervalSchedule,
  RuleTaskState,
  SanitizedAlert,
} from '../common';
import { LicenseType } from '../../licensing/server';
import { IAbortableClusterClient } from './lib/create_abortable_es_client_factory';
import { ConcreteTaskInstance } from '../../task_manager/server';
import { IEventLogger } from '../../event_log/server';
import { ExecutionHandler } from './task_runner/create_execution_handler';

export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type GetServicesFunction = (request: KibanaRequest) => Services;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;

/**
 * @public
 */
export interface AlertingApiRequestHandlerContext {
  getRulesClient: () => RulesClient;
  listTypes: RuleTypeRegistry['list'];
  getFrameworkHealth: () => Promise<AlertsHealth>;
  areApiKeysEnabled: () => Promise<boolean>;
}

/**
 * @internal
 */
export interface AlertingRequestHandlerContext extends RequestHandlerContext {
  alerting: AlertingApiRequestHandlerContext;
}

/**
 * @internal
 */
export type AlertingRouter = IRouter<AlertingRequestHandlerContext>;

export interface Services {
  savedObjectsClient: SavedObjectsClientContract;
  scopedClusterClient: IScopedClusterClient;
}

export interface AlertServices<
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext,
  ActionGroupIds extends string = never
> extends Services {
  alertFactory: {
    create: (id: string) => PublicAlert<InstanceState, InstanceContext, ActionGroupIds>;
  };
  shouldWriteAlerts: () => boolean;
  shouldStopExecution: () => boolean;
  search: IAbortableClusterClient;
}

export interface AlertExecutorOptions<
  Params extends AlertTypeParams = never,
  State extends AlertTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
> {
  alertId: string;
  executionId: string;
  startedAt: Date;
  previousStartedAt: Date | null;
  services: AlertServices<InstanceState, InstanceContext, ActionGroupIds>;
  params: Params;
  state: State;
  rule: SanitizedRuleConfig;
  spaceId: string;
  namespace?: string;
  name: string;
  tags: string[];
  createdBy: string | null;
  updatedBy: string | null;
}

export interface RuleParamsAndRefs<Params extends AlertTypeParams> {
  references: SavedObjectReference[];
  params: Params;
}

export type ExecutorType<
  Params extends AlertTypeParams = never,
  State extends AlertTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
> = (
  options: AlertExecutorOptions<Params, State, InstanceState, InstanceContext, ActionGroupIds>
) => Promise<State | void>;

export interface AlertTypeParamsValidator<Params extends AlertTypeParams> {
  validate: (object: unknown) => Params;
}
export interface RuleType<
  Params extends AlertTypeParams = never,
  ExtractedParams extends AlertTypeParams = never,
  State extends AlertTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never,
  RecoveryActionGroupId extends string = never
> {
  id: string;
  name: string;
  validate?: {
    params?: AlertTypeParamsValidator<Params>;
  };
  actionGroups: Array<ActionGroup<ActionGroupIds>>;
  defaultActionGroupId: ActionGroup<ActionGroupIds>['id'];
  recoveryActionGroup?: ActionGroup<RecoveryActionGroupId>;
  executor: ExecutorType<
    Params,
    State,
    InstanceState,
    InstanceContext,
    /**
     * Ensure that the reserved ActionGroups (such as `Recovered`) are not
     * available for scheduling in the Executor
     */
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  >;
  producer: string;
  actionVariables?: {
    context?: ActionVariable[];
    state?: ActionVariable[];
    params?: ActionVariable[];
  };
  minimumLicenseRequired: LicenseType;
  useSavedObjectReferences?: {
    extractReferences: (params: Params) => RuleParamsAndRefs<ExtractedParams>;
    injectReferences: (params: ExtractedParams, references: SavedObjectReference[]) => Params;
  };
  isExportable: boolean;
  defaultScheduleInterval?: string;
  minimumScheduleInterval?: string;
  ruleTaskTimeout?: string;
  cancelAlertsOnRuleTimeout?: boolean;
}
export type UntypedRuleType = RuleType<
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext
>;

export interface RawAlertAction extends SavedObjectAttributes {
  group: string;
  actionRef: string;
  actionTypeId: string;
  params: AlertActionParams;
}

export interface AlertMeta extends SavedObjectAttributes {
  versionApiKeyLastmodified?: string;
}

// note that the `error` property is "null-able", as we're doing a partial
// update on the alert when we update this data, but need to ensure we
// delete any previous error if the current status has no error
export interface RawRuleExecutionStatus extends SavedObjectAttributes {
  status: AlertExecutionStatuses;
  numberOfTriggeredActions?: number;
  lastExecutionDate: string;
  lastDuration?: number;
  error: null | {
    reason: AlertExecutionStatusErrorReasons;
    message: string;
  };
}

export type PartialAlert<Params extends AlertTypeParams = never> = Pick<Alert<Params>, 'id'> &
  Partial<Omit<Alert<Params>, 'id'>>;

export interface AlertWithLegacyId<Params extends AlertTypeParams = never> extends Alert<Params> {
  legacyId: string | null;
}

export type SanitizedRuleWithLegacyId<Params extends AlertTypeParams = never> = Omit<
  AlertWithLegacyId<Params>,
  'apiKey'
>;

export type PartialAlertWithLegacyId<Params extends AlertTypeParams = never> = Pick<
  AlertWithLegacyId<Params>,
  'id'
> &
  Partial<Omit<AlertWithLegacyId<Params>, 'id'>>;

export interface RawRule extends SavedObjectAttributes {
  enabled: boolean;
  name: string;
  tags: string[];
  alertTypeId: string; // this cannot be renamed since it is in the saved object
  consumer: string;
  legacyId: string | null;
  schedule: SavedObjectAttributes;
  actions: RawAlertAction[];
  params: SavedObjectAttributes;
  scheduledTaskId?: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  apiKey: string | null;
  apiKeyOwner: string | null;
  throttle: string | null;
  notifyWhen: AlertNotifyWhenType | null;
  muteAll: boolean;
  mutedInstanceIds: string[];
  meta?: AlertMeta;
  executionStatus: RawRuleExecutionStatus;
  monitoring?: RuleMonitoring;
}

export type AlertInfoParams = Pick<
  RawRule,
  | 'params'
  | 'throttle'
  | 'notifyWhen'
  | 'muteAll'
  | 'mutedInstanceIds'
  | 'name'
  | 'tags'
  | 'createdBy'
  | 'updatedBy'
>;

export interface AlertingPlugin {
  setup: PluginSetupContract;
  start: PluginStartContract;
}

export interface AlertsConfigType {
  healthCheck: {
    interval: string;
  };
}

export interface AlertsConfigType {
  invalidateApiKeysTask: {
    interval: string;
    removalDelay: string;
  };
}

export interface InvalidatePendingApiKey {
  apiKeyId: string;
  createdAt: string;
}

export type RuleTypeRegistry = PublicMethodsOf<OrigruleTypeRegistry>;

export interface RuleTaskRunResultWithActions {
  state: RuleTaskStateWithActions;
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
}
