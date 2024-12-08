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
import { z } from '@kbn/zod';
import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { LicenseType } from '@kbn/licensing-plugin/server';
import {
  IScopedClusterClient,
  SavedObjectAttributes,
  SavedObjectsClientContract,
  Logger,
} from '@kbn/core/server';
import type { ObjectType } from '@kbn/config-schema';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { SharePluginStart } from '@kbn/share-plugin/server';
import type { DefaultAlert, FieldMap } from '@kbn/alerts-as-data-utils';
import { Alert } from '@kbn/alerts-as-data-utils';
import { ActionsApiRequestHandlerContext } from '@kbn/actions-plugin/server';
import { AlertsHealth } from '@kbn/alerting-types';
import { RuleTypeRegistry as OrigruleTypeRegistry } from './rule_type_registry';
import { AlertingServerSetup, AlertingServerStart } from './plugin';
import { RulesClient } from './rules_client';
import {
  RulesSettingsClient,
  RulesSettingsFlappingClient,
  RulesSettingsQueryDelayClient,
} from './rules_settings';
import { MaintenanceWindowClient } from './maintenance_window_client';
export * from '../common';
import {
  Rule,
  RuleTypeParams,
  RuleTypeState,
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  WithoutReservedActionGroups,
  ActionVariable,
  SanitizedRuleConfig,
  SanitizedRule,
  RuleAlertData,
} from '../common';
import { PublicAlertFactory } from './alert/create_alert_factory';
import { RulesSettingsFlappingProperties } from '../common/rules_settings';
import { PublicAlertsClient } from './alerts_client/types';
import { GetTimeRangeResult } from './lib/get_time_range';
export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;
export type { RuleTypeParams };
/**
 * @public
 */
export interface AlertingApiRequestHandlerContext {
  getRulesClient: () => Promise<RulesClient>;
  getRulesSettingsClient: (withoutAuth?: boolean) => RulesSettingsClient;
  getMaintenanceWindowClient: () => MaintenanceWindowClient;
  listTypes: RuleTypeRegistry['list'];
  getFrameworkHealth: () => Promise<AlertsHealth>;
  areApiKeysEnabled: () => Promise<boolean>;
}

/**
 * @internal
 */
export type AlertingRequestHandlerContext = CustomRequestHandlerContext<{
  alerting: AlertingApiRequestHandlerContext;
  actions: ActionsApiRequestHandlerContext;
}>;

/**
 * @internal
 */
export type AlertingRouter = IRouter<AlertingRequestHandlerContext>;
export interface RuleExecutorServices<
  State extends AlertInstanceState = AlertInstanceState,
  Context extends AlertInstanceContext = AlertInstanceContext,
  ActionGroupIds extends string = never,
  AlertData extends RuleAlertData = RuleAlertData
> {
  /**
   * Only available when framework alerts are enabled and rule
   * type has registered alert context with the framework with shouldWrite set to true
   */
  alertsClient: PublicAlertsClient<AlertData, State, Context, ActionGroupIds> | null;
  /**
   * Deprecate alertFactory and remove when all rules are onboarded to
   * the alertsClient
   * @deprecated
   */
  alertFactory: PublicAlertFactory<State, Context, ActionGroupIds>;
  getDataViews: () => Promise<DataViewsContract>;
  getMaintenanceWindowIds: () => Promise<string[]>;
  getSearchSourceClient: () => Promise<ISearchStartSearchSource>;
  ruleMonitoringService?: PublicRuleMonitoringService;
  ruleResultService?: PublicRuleResultService;
  savedObjectsClient: SavedObjectsClientContract;
  scopedClusterClient: IScopedClusterClient;
  share: SharePluginStart;
  shouldStopExecution: () => boolean;
  shouldWriteAlerts: () => boolean;
  uiSettingsClient: IUiSettingsClient;
}

export interface RuleExecutorOptions<
  Params extends RuleTypeParams = never,
  State extends RuleTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never,
  AlertData extends RuleAlertData = never
> {
  executionId: string;
  logger: Logger;
  params: Params;
  previousStartedAt: Date | null;
  rule: SanitizedRuleConfig;
  services: RuleExecutorServices<InstanceState, InstanceContext, ActionGroupIds, AlertData>;
  spaceId: string;
  startedAt: Date;
  startedAtOverridden: boolean;
  state: State;
  namespace?: string;
  flappingSettings: RulesSettingsFlappingProperties;
  getTimeRange: (timeWindow?: string) => GetTimeRangeResult;
  isServerless: boolean;
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
  ActionGroupIds extends string = never,
  AlertData extends RuleAlertData = never
> = (
  options: RuleExecutorOptions<
    Params,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    AlertData
  >
) => Promise<{ state: State }>;

export interface RuleTypeParamsValidator<Params extends RuleTypeParams> {
  validate: (object: Partial<Params>) => Params;
  validateMutatedParams?: (mutatedOject: Params, origObject?: Params) => Params;
}

export type AlertHit = Alert & {
  _id: string;
  _index: string;
};
export interface SummarizedAlertsChunk {
  count: number;
  data: AlertHit[];
}

export type ScopedQueryAlerts = Record<string, string[]>;

export interface SummarizedAlerts {
  new: SummarizedAlertsChunk;
  ongoing: SummarizedAlertsChunk;
  recovered: SummarizedAlertsChunk;
}
export interface CombinedSummarizedAlerts extends SummarizedAlerts {
  all: SummarizedAlertsChunk;
}
export interface GetViewInAppRelativeUrlFnOpts<Params extends RuleTypeParams> {
  rule: Pick<SanitizedRule<Params>, 'id'> &
    Omit<Partial<SanitizedRule<Params>>, 'viewInAppRelativeUrl'>;
  // Optional time bounds
  start?: number;
  end?: number;
}
export type GetViewInAppRelativeUrlFn<Params extends RuleTypeParams> = (
  opts: GetViewInAppRelativeUrlFnOpts<Params>
) => string;

interface ComponentTemplateSpec {
  dynamic?: 'strict' | false; // defaults to 'strict'
  fieldMap: FieldMap;
}

export type FormatAlert<AlertData extends RuleAlertData> = (
  alert: Partial<AlertData>
) => Partial<AlertData>;

export const DEFAULT_AAD_CONFIG: IRuleTypeAlerts<DefaultAlert> = {
  context: `default`,
  mappings: { fieldMap: {} },
  shouldWrite: true,
};

export interface IRuleTypeAlerts<AlertData extends RuleAlertData = never> {
  /**
   * Specifies the target alerts-as-data resource
   * for this rule type. All alerts created with the same
   * context are written to the same alerts-as-data index.
   *
   * All custom mappings defined for a context must be the same!
   */
  context: string;

  /**
   * Specifies custom mappings for the target alerts-as-data
   * index. These mappings will be translated into a component template
   * and used in the index template for the index.
   */
  mappings: ComponentTemplateSpec;

  /**
   * Optional flag to opt into writing alerts as data. When not specified
   * defaults to false. We need this because we needed all previous rule
   * registry rules to register with the framework in order to install
   * Elasticsearch assets but we don't want to migrate them to using
   * the framework for writing alerts as data until all the pieces are ready
   */
  shouldWrite?: boolean;

  /**
   * Optional flag to include a reference to the ECS component template.
   */
  useEcs?: boolean;

  /**
   * Optional flag to include a reference to the legacy alert component template.
   * Any rule type that is migrating from the rule registry should set this
   * flag to true to ensure their alerts-as-data indices are backwards compatible.
   */
  useLegacyAlerts?: boolean;

  /**
   * Optional flag to indicate that resources should be space-aware. When set to
   * true, alerts-as-data resources will be created for every space where a rule
   * of this type runs.
   */
  isSpaceAware?: boolean;

  /**
   * Optional secondary alias to use. This alias should not include the namespace.
   */
  secondaryAlias?: string;

  /**
   * Optional function to format each alert in summarizedAlerts right after fetching them.
   */
  formatAlert?: FormatAlert<AlertData>;
}

export interface RuleType<
  Params extends RuleTypeParams = never,
  ExtractedParams extends RuleTypeParams = never,
  State extends RuleTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never,
  RecoveryActionGroupId extends string = never,
  AlertData extends RuleAlertData = never
> {
  id: string;
  name: string;
  validate: {
    params: RuleTypeParamsValidator<Params>;
  };
  schemas?: {
    params?:
      | {
          type: 'zod';
          schema: z.ZodObject<z.ZodRawShape> | z.ZodIntersection<z.ZodTypeAny, z.ZodTypeAny>;
        }
      | {
          type: 'config-schema';
          schema: ObjectType;
        };
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
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>,
    AlertData
  >;
  category: string;
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
  alerts?: IRuleTypeAlerts<AlertData>;
  /**
   * Determines whether framework should
   * automatically make recovery determination. Defaults to true.
   */
  autoRecoverAlerts?: boolean;
  getViewInAppRelativeUrl?: GetViewInAppRelativeUrlFn<Params>;
  fieldsForAAD?: string[];
}
export type UntypedRuleType = RuleType<
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext
>;

export interface RuleMeta extends SavedObjectAttributes {
  versionApiKeyLastmodified?: string;
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

export interface AlertingPlugin {
  setup: AlertingServerSetup;
  start: AlertingServerStart;
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
export type RulesSettingsQueryDelayClientApi = PublicMethodsOf<RulesSettingsQueryDelayClient>;

export type MaintenanceWindowClientApi = PublicMethodsOf<MaintenanceWindowClient>;

export interface PublicMetricsSetters {
  setLastRunMetricsTotalSearchDurationMs: (totalSearchDurationMs: number) => void;
  setLastRunMetricsTotalIndexingDurationMs: (totalIndexingDurationMs: number) => void;
  setLastRunMetricsTotalAlertsDetected: (totalAlertDetected: number) => void;
  setLastRunMetricsTotalAlertsCreated: (totalAlertCreated: number) => void;
  setLastRunMetricsGapDurationS: (gapDurationS: number) => void;
  setLastRunMetricsGapRange: (gapRange: { lte: string; gte: string } | null) => void;
}

export interface PublicLastRunSetters {
  addLastRunError: (message: string, userError?: boolean) => void;
  addLastRunWarning: (outcomeMsg: string) => void;
  setLastRunOutcomeMessage: (warning: string) => void;
}

export type PublicRuleMonitoringService = PublicMetricsSetters;

export type PublicRuleResultService = PublicLastRunSetters;

export type {
  RawRule,
  RawRuleAction,
  RawRuleExecutionStatus,
  RawRuleAlertsFilter,
  RawRuleLastRun,
  RawRuleMonitoring,
} from './saved_objects/schemas/raw_rule';

export type { DataStreamAdapter } from './alerts_service/lib/data_stream_adapter';
