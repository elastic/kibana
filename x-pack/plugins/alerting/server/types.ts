/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  CustomRequestHandlerContext,
  SavedObjectReference,
  IUiSettingsClient,
  IScopedClusterClient,
  SavedObjectAttributes,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { LicenseType } from '@kbn/licensing-plugin/server';
import { AlertFactoryDoneUtils, PublicAlert } from './alert';
import { RuleTypeRegistry as OrigruleTypeRegistry } from './rule_type_registry';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { RulesClient } from './rules_client';

export * from '../common';
import {
  Rule,
  RuleTypeParams,
  RuleTypeState,
  RuleActionParams,
  RuleExecutionStatuses,
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
  RuleNotifyWhenType,
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  AlertsHealth,
  WithoutReservedActionGroups,
  ActionVariable,
  SanitizedRuleConfig,
  RuleMonitoring,
  MappedParams,
} from '../common';
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
export type AlertingRequestHandlerContext = CustomRequestHandlerContext<{
  alerting: AlertingApiRequestHandlerContext;
}>;

/**
 * @internal
 */
export type AlertingRouter = IRouter<AlertingRequestHandlerContext>;

export interface RuleExecutorServices<
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

export interface RuleExecutorOptions<
  Params extends RuleTypeParams = never,
  State extends RuleTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
> {
  alertId: string;
  executionId: string;
  startedAt: Date;
  previousStartedAt: Date | null;
  services: RuleExecutorServices<InstanceState, InstanceContext, ActionGroupIds>;
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

export interface RuleParamsAndRefs<Params extends RuleTypeParams> {
  references: SavedObjectReference[];
  params: Params;
}

export type ExecutorType<
  Params extends RuleTypeParams = never,
  State extends RuleTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
> = (
  options: RuleExecutorOptions<Params, State, InstanceState, InstanceContext, ActionGroupIds>
) => Promise<State | void>;

export interface RuleTypeParamsValidator<Params extends RuleTypeParams> {
  validate: (object: unknown) => Params;
}

export interface RuleType<
  Params extends RuleTypeParams = never,
  ExtractedParams extends RuleTypeParams = never,
  State extends RuleTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never,
  RecoveryActionGroupId extends string = never
> {
  id: string;
  name: string;
  validate?: {
    params?: RuleTypeParamsValidator<Params>;
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
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext
>;

export interface RawRuleAction extends SavedObjectAttributes {
  group: string;
  actionRef: string;
  actionTypeId: string;
  params: RuleActionParams;
}

export interface RuleMeta extends SavedObjectAttributes {
  versionApiKeyLastmodified?: string;
}

// note that the `error` property is "null-able", as we're doing a partial
// update on the rule when we update this data, but need to ensure we
// delete any previous error if the current status has no error
export interface RawRuleExecutionStatus extends SavedObjectAttributes {
  status: RuleExecutionStatuses;
  lastExecutionDate: string;
  lastDuration?: number;
  error: null | {
    reason: RuleExecutionStatusErrorReasons;
    message: string;
  };
  warning: null | {
    reason: RuleExecutionStatusWarningReasons;
    message: string;
  };
}

export type PartialRule<Params extends RuleTypeParams = never> = Pick<Rule<Params>, 'id'> &
  Partial<Omit<Rule<Params>, 'id'>>;

export interface RuleWithLegacyId<Params extends RuleTypeParams = never> extends Rule<Params> {
  legacyId: string | null;
}

export type SanitizedRuleWithLegacyId<Params extends RuleTypeParams = never> = Omit<
  RuleWithLegacyId<Params>,
  'apiKey'
>;

export type PartialRuleWithLegacyId<Params extends RuleTypeParams = never> = Pick<
  RuleWithLegacyId<Params>,
  'id'
> &
  Partial<Omit<RuleWithLegacyId<Params>, 'id'>>;

export interface RawRule extends SavedObjectAttributes {
  enabled: boolean;
  name: string;
  tags: string[];
  alertTypeId: string; // this cannot be renamed since it is in the saved object
  consumer: string;
  legacyId: string | null;
  schedule: SavedObjectAttributes;
  actions: RawRuleAction[];
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
  notifyWhen: RuleNotifyWhenType | null;
  muteAll: boolean;
  mutedInstanceIds: string[];
  meta?: RuleMeta;
  executionStatus: RawRuleExecutionStatus;
  monitoring?: RuleMonitoring;
  snoozeEndTime?: string | null; // Remove ? when this parameter is made available in the public API
}

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
