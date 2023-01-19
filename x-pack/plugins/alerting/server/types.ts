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
} from '@kbn/core/server';
import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { LicenseType } from '@kbn/licensing-plugin/server';
import {
  IScopedClusterClient,
  SavedObjectAttributes,
  SavedObjectsClientContract,
  Logger,
} from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { RuleTypeRegistry as OrigruleTypeRegistry } from './rule_type_registry';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { RulesClient } from './rules_client';
import { RulesSettingsClient, RulesSettingsFlappingClient } from './rules_settings_client';
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
  RuleSnooze,
  IntervalSchedule,
  RuleLastRun,
} from '../common';
import { PublicAlertFactory } from './alert/create_alert_factory';
export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;
export type { RuleTypeParams };
/**
 * @public
 */
export interface AlertingApiRequestHandlerContext {
  getRulesClient: () => RulesClient;
  getRulesSettingsClient: () => RulesSettingsClient;
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
  State extends AlertInstanceState = AlertInstanceState,
  Context extends AlertInstanceContext = AlertInstanceContext,
  ActionGroupIds extends string = never
> {
  searchSourceClient: ISearchStartSearchSource;
  savedObjectsClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  scopedClusterClient: IScopedClusterClient;
  alertFactory: PublicAlertFactory<State, Context, ActionGroupIds>;
  shouldWriteAlerts: () => boolean;
  shouldStopExecution: () => boolean;
  ruleMonitoringService?: PublicRuleMonitoringService;
  share: SharePluginStart;
  dataViews: DataViewsContract;
  ruleResultService?: PublicRuleResultService;
}

export interface RuleExecutorOptions<
  Params extends RuleTypeParams = never,
  State extends RuleTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
> {
  executionId: string;
  logger: Logger;
  params: Params;
  previousStartedAt: Date | null;
  rule: SanitizedRuleConfig;
  services: RuleExecutorServices<InstanceState, InstanceContext, ActionGroupIds>;
  spaceId: string;
  startedAt: Date;
  state: State;
  namespace?: string;
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
) => Promise<{ state: State }>;

export interface RuleTypeParamsValidator<Params extends RuleTypeParams> {
  validate: (object: unknown) => Params;
  validateMutatedParams?: (mutatedOject: Params, origObject?: Params) => Params;
}

export interface GetSummarizedAlertsFnOpts {
  start?: Date;
  end?: Date;
  executionUuid?: string;
  ruleId: string;
  spaceId: string;
  excludedAlertInstanceIds: string[];
}

// TODO - add type for these alerts when we determine which alerts-as-data
// fields will be made available in https://github.com/elastic/kibana/issues/143741
export interface SummarizedAlerts {
  new: {
    count: number;
    data: unknown[];
  };
  ongoing: {
    count: number;
    data: unknown[];
  };
  recovered: {
    count: number;
    data: unknown[];
  };
}
export type GetSummarizedAlertsFn = (opts: GetSummarizedAlertsFnOpts) => Promise<SummarizedAlerts>;

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
  getSummarizedAlerts?: GetSummarizedAlertsFn;
  /**
   * Determines whether framework should
   * automatically make recovery determination. Defaults to true.
   */
  autoRecoverAlerts?: boolean;
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
  frequency?: {
    summary: boolean;
    notifyWhen: RuleNotifyWhenType;
    throttle: string | null;
  };
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
  schedule: IntervalSchedule;
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
  throttle?: string | null;
  notifyWhen?: RuleNotifyWhenType | null;
  muteAll: boolean;
  mutedInstanceIds: string[];
  meta?: RuleMeta;
  executionStatus: RawRuleExecutionStatus;
  monitoring?: RawRuleMonitoring;
  snoozeSchedule?: RuleSnooze; // Remove ? when this parameter is made available in the public API
  isSnoozedUntil?: string | null;
  lastRun?: RawRuleLastRun | null;
  nextRun?: string | null;
  running?: boolean | null;
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

export type RulesClientApi = PublicMethodsOf<RulesClient>;

export type RulesSettingsClientApi = PublicMethodsOf<RulesSettingsClient>;
export type RulesSettingsFlappingClientApi = PublicMethodsOf<RulesSettingsFlappingClient>;

export interface PublicMetricsSetters {
  setLastRunMetricsTotalSearchDurationMs: (totalSearchDurationMs: number) => void;
  setLastRunMetricsTotalIndexingDurationMs: (totalIndexingDurationMs: number) => void;
  setLastRunMetricsTotalAlertsDetected: (totalAlertDetected: number) => void;
  setLastRunMetricsTotalAlertsCreated: (totalAlertCreated: number) => void;
  setLastRunMetricsGapDurationS: (gapDurationS: number) => void;
}

export interface PublicLastRunSetters {
  addLastRunError: (outcome: string) => void;
  addLastRunWarning: (outcomeMsg: string) => void;
  setLastRunOutcomeMessage: (warning: string) => void;
}

export type PublicRuleMonitoringService = PublicMetricsSetters;

export type PublicRuleResultService = PublicLastRunSetters;

export interface RawRuleLastRun extends SavedObjectAttributes, RuleLastRun {}
export interface RawRuleMonitoring extends SavedObjectAttributes, RuleMonitoring {}
