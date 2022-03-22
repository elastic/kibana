/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  RequestHandlerContext,
  SavedObjectReference,
  IUiSettingsClient,
} from 'src/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { AlertFactoryDoneUtils, PublicAlert } from './alert';
import { RuleTypeRegistry as OrigruleTypeRegistry } from './rule_type_registry';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { RulesClient } from './rules_client';
export * from '../common';
import {
  IScopedClusterClient,
  SavedObjectAttributes,
  SavedObjectsClientContract,
} from '../../../../src/core/server';
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
  MappedParams,
  AlertExecutionStatusWarningReasons,
} from '../common';
import { LicenseType } from '../../licensing/server';
import { ISearchStartSearchSource } from '../../../../src/plugins/data/common';
import { RuleTypeConfig } from './config';
export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
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

export interface AlertServices<
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext,
  ActionGroupIds extends string = never
> {
  searchSourceClient: Promise<ISearchStartSearchSource>;
  savedObjectsClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  scopedClusterClient: IScopedClusterClient;
  alertFactory: {
    create: (id: string) => PublicAlert<InstanceState, InstanceContext, ActionGroupIds>;
    done: () => AlertFactoryDoneUtils<InstanceState, InstanceContext, ActionGroupIds>;
  };
  shouldWriteAlerts: () => boolean;
  shouldStopExecution: () => boolean;
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
  ruleTaskTimeout?: string;
  cancelAlertsOnRuleTimeout?: boolean;
  doesSetRecoveryContext?: boolean;
  config?: RuleTypeConfig;
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
  warning: null | {
    reason: AlertExecutionStatusWarningReasons;
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
  mapped_params?: MappedParams;
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
  snoozeEndTime?: string | null; // Remove ? when this parameter is made available in the public API
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
