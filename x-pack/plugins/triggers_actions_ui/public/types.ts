/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DocLinksStart } from 'kibana/public';
import type { ComponentType } from 'react';
import type { ChartsPluginSetup } from 'src/plugins/charts/public';
import type { DataPublicPluginStart } from 'src/plugins/data/public';
import type { DataViewsPublicPluginStart } from 'src/plugins/data_views/public';
import type { UnifiedSearchPublicPluginStart } from 'src/plugins/unified_search/public';
import type { IconType } from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import {
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridCellValueElementProps,
} from '@elastic/eui';
import {
  ActionType,
  AlertHistoryEsIndexConnectorId,
  AlertHistoryDocumentTemplate,
  ALERT_HISTORY_PREFIX,
  AlertHistoryDefaultIndexName,
  AsApiContract,
} from '../../actions/common';
import { TypeRegistry } from './application/type_registry';
import {
  ActionGroup,
  RuleActionParam,
  SanitizedRule as AlertingSanitizedRule,
  ResolvedSanitizedRule,
  RuleAction,
  RuleAggregations as AlertingRuleAggregations,
  RuleTaskState,
  AlertSummary as RuleSummary,
  ExecutionDuration,
  AlertStatus,
  RawAlertInstance,
  AlertingFrameworkHealth,
  RuleNotifyWhenType,
  RuleTypeParams,
  ActionVariable,
  RuleType as CommonRuleType,
} from '../../alerting/common';
import { RuleRegistrySearchRequestPagination } from '../../rule_registry/common';

// In Triggers and Actions we treat all `Alert`s as `SanitizedRule<RuleTypeParams>`
// so the `Params` is a black-box of Record<string, unknown>
type SanitizedRule<Params extends RuleTypeParams = never> = Omit<
  AlertingSanitizedRule<Params>,
  'alertTypeId'
> & {
  ruleTypeId: AlertingSanitizedRule['alertTypeId'];
};
type Rule<Params extends RuleTypeParams = RuleTypeParams> = SanitizedRule<Params>;
type ResolvedRule = Omit<ResolvedSanitizedRule<RuleTypeParams>, 'alertTypeId'> & {
  ruleTypeId: ResolvedSanitizedRule['alertTypeId'];
};
type RuleAggregations = Omit<AlertingRuleAggregations, 'alertExecutionStatus'> & {
  ruleExecutionStatus: AlertingRuleAggregations['alertExecutionStatus'];
};

export type {
  Rule,
  RuleAction,
  RuleAggregations,
  RuleTaskState,
  RuleSummary,
  ExecutionDuration,
  AlertStatus,
  RawAlertInstance,
  AlertingFrameworkHealth,
  RuleNotifyWhenType,
  RuleTypeParams,
  ResolvedRule,
  SanitizedRule,
};
export type { ActionType, AsApiContract };
export {
  AlertHistoryEsIndexConnectorId,
  AlertHistoryDocumentTemplate,
  AlertHistoryDefaultIndexName,
  ALERT_HISTORY_PREFIX,
};

export type ActionTypeIndex = Record<string, ActionType>;
export type RuleTypeIndex = Map<string, RuleType>;
export type ActionTypeRegistryContract<
  ActionConnector = unknown,
  ActionParams = unknown
> = PublicMethodsOf<TypeRegistry<ActionTypeModel<ActionConnector, ActionParams>>>;
export type RuleTypeRegistryContract = PublicMethodsOf<TypeRegistry<RuleTypeModel>>;

export type ActionConnectorFieldsCallbacks = {
  beforeActionConnectorSave?: () => Promise<void>;
  afterActionConnectorSave?: (connector: ActionConnector) => Promise<void>;
} | null;
export type ActionConnectorFieldsSetCallbacks = React.Dispatch<
  React.SetStateAction<ActionConnectorFieldsCallbacks>
>;

export interface ActionConnectorFieldsProps<TActionConnector> {
  action: TActionConnector;
  editActionConfig: (property: string, value: unknown) => void;
  editActionSecrets: (property: string, value: unknown) => void;
  errors: IErrorObject;
  readOnly: boolean;
  consumer?: string;
  setCallbacks: ActionConnectorFieldsSetCallbacks;
  isEdit: boolean;
}

export enum RuleFlyoutCloseReason {
  SAVED,
  CANCELED,
}

export interface ActionParamsProps<TParams> {
  actionParams: Partial<TParams>;
  index: number;
  editAction: (key: string, value: RuleActionParam, index: number) => void;
  errors: IErrorObject;
  messageVariables?: ActionVariable[];
  defaultMessage?: string;
  actionConnector?: ActionConnector;
  isLoading?: boolean;
  isDisabled?: boolean;
  showEmailSubjectAndMessage?: boolean;
}

export interface Pagination {
  index: number;
  size: number;
}

export interface Sorting {
  field: string;
  direction: string;
}

interface CustomConnectorSelectionItem {
  getText: (actionConnector: ActionConnector) => string;
  getComponent: (
    actionConnector: ActionConnector
  ) => React.LazyExoticComponent<ComponentType<{ actionConnector: ActionConnector }>> | undefined;
}

export interface ActionTypeModel<ActionConfig = any, ActionSecrets = any, ActionParams = any> {
  id: string;
  iconClass: IconType;
  selectMessage: string;
  actionTypeTitle?: string;
  validateConnector: (
    connector: UserConfiguredActionConnector<ActionConfig, ActionSecrets>
  ) => Promise<ConnectorValidationResult<Partial<ActionConfig>, Partial<ActionSecrets>>>;
  validateParams: (
    actionParams: ActionParams
  ) => Promise<GenericValidationResult<Partial<ActionParams> | unknown>>;
  actionConnectorFields: React.LazyExoticComponent<
    ComponentType<
      ActionConnectorFieldsProps<UserConfiguredActionConnector<ActionConfig, ActionSecrets>>
    >
  > | null;
  actionParamsFields: React.LazyExoticComponent<ComponentType<ActionParamsProps<ActionParams>>>;
  customConnectorSelectItem?: CustomConnectorSelectionItem;
}

export interface GenericValidationResult<T> {
  errors: Record<Extract<keyof T, string>, string[] | unknown>;
}

export interface ValidationResult {
  errors: Record<string, any>;
}

export interface ConnectorValidationResult<Config, Secrets> {
  config?: GenericValidationResult<Config>;
  secrets?: GenericValidationResult<Secrets>;
}

export interface ActionConnectorProps<Config, Secrets> {
  secrets: Secrets;
  id: string;
  actionTypeId: string;
  name: string;
  referencedByCount?: number;
  config: Config;
  isPreconfigured: boolean;
  isMissingSecrets?: boolean;
}

export type PreConfiguredActionConnector = Omit<
  ActionConnectorProps<never, never>,
  'config' | 'secrets'
> & {
  isPreconfigured: true;
};

export type UserConfiguredActionConnector<Config, Secrets> = ActionConnectorProps<
  Config,
  Secrets
> & {
  isPreconfigured: false;
};

export type ActionConnector<Config = Record<string, unknown>, Secrets = Record<string, unknown>> =
  | PreConfiguredActionConnector
  | UserConfiguredActionConnector<Config, Secrets>;

export type ActionConnectorWithoutId<
  Config = Record<string, unknown>,
  Secrets = Record<string, unknown>
> = Omit<UserConfiguredActionConnector<Config, Secrets>, 'id'>;

export type ActionConnectorTableItem = ActionConnector & {
  actionType: ActionType['name'];
};

type AsActionVariables<Keys extends string> = {
  [Req in Keys]: ActionVariable[];
};
export const REQUIRED_ACTION_VARIABLES = ['params'] as const;
export const CONTEXT_ACTION_VARIABLES = ['context'] as const;
export const OPTIONAL_ACTION_VARIABLES = [...CONTEXT_ACTION_VARIABLES, 'state'] as const;
export type ActionVariables = AsActionVariables<typeof REQUIRED_ACTION_VARIABLES[number]> &
  Partial<AsActionVariables<typeof OPTIONAL_ACTION_VARIABLES[number]>>;

export interface RuleType<
  ActionGroupIds extends string = string,
  RecoveryActionGroupId extends string = string
> extends Pick<
    CommonRuleType<ActionGroupIds, RecoveryActionGroupId>,
    | 'id'
    | 'name'
    | 'actionGroups'
    | 'producer'
    | 'minimumLicenseRequired'
    | 'recoveryActionGroup'
    | 'defaultActionGroupId'
    | 'ruleTaskTimeout'
    | 'defaultScheduleInterval'
    | 'doesSetRecoveryContext'
  > {
  actionVariables: ActionVariables;
  authorizedConsumers: Record<string, { read: boolean; all: boolean }>;
  enabledInLicense: boolean;
}

export type SanitizedRuleType = Omit<RuleType, 'apiKey'>;

export type RuleUpdates = Omit<Rule, 'id' | 'executionStatus'>;

export interface RuleTableItem extends Rule {
  ruleType: RuleType['name'];
  index: number;
  actionsCount: number;
  isEditable: boolean;
  enabledInLicense: boolean;
  showIntervalWarning?: boolean;
}

export interface RuleTypeParamsExpressionProps<
  Params extends RuleTypeParams = RuleTypeParams,
  MetaData = Record<string, unknown>,
  ActionGroupIds extends string = string
> {
  ruleParams: Params;
  ruleInterval: string;
  ruleThrottle: string;
  alertNotifyWhen: RuleNotifyWhenType;
  setRuleParams: <Key extends keyof Params>(property: Key, value: Params[Key] | undefined) => void;
  setRuleProperty: <Prop extends keyof Rule>(
    key: Prop,
    value: SanitizedRule<Params>[Prop] | null
  ) => void;
  errors: IErrorObject;
  defaultActionGroupId: string;
  actionGroups: Array<ActionGroup<ActionGroupIds>>;
  metadata?: MetaData;
  charts: ChartsPluginSetup;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export interface RuleTypeModel<Params extends RuleTypeParams = RuleTypeParams> {
  id: string;
  description: string;
  iconClass: string;
  documentationUrl: string | ((docLinks: DocLinksStart) => string) | null;
  validate: (ruleParams: Params) => ValidationResult;
  ruleParamsExpression:
    | React.FunctionComponent<any>
    | React.LazyExoticComponent<ComponentType<RuleTypeParamsExpressionProps<Params>>>;
  requiresAppContext: boolean;
  defaultActionMessage?: string;
}

export interface IErrorObject {
  [key: string]: string | string[] | IErrorObject;
}

export interface ConnectorAddFlyoutProps {
  onClose: () => void;
  actionTypes?: ActionType[];
  onTestConnector?: (connector: ActionConnector) => void;
  reloadConnectors?: () => Promise<ActionConnector[] | void>;
  consumer?: string;
  actionTypeRegistry: ActionTypeRegistryContract;
}
export enum EditConectorTabs {
  Configuration = 'configuration',
  Test = 'test',
}

export interface ConnectorEditFlyoutProps {
  initialConnector: ActionConnector;
  onClose: () => void;
  tab?: EditConectorTabs;
  reloadConnectors?: () => Promise<ActionConnector[] | void>;
  consumer?: string;
  actionTypeRegistry: ActionTypeRegistryContract;
}

export interface RuleEditProps<MetaData = Record<string, any>> {
  initialRule: Rule;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: (reason: RuleFlyoutCloseReason) => void;
  /** @deprecated use `onSave` as a callback after an alert is saved*/
  reloadRules?: () => Promise<void>;
  onSave?: () => Promise<void>;
  metadata?: MetaData;
  ruleType?: RuleType<string, string>;
}

export interface RuleAddProps<MetaData = Record<string, any>> {
  consumer: string;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: (reason: RuleFlyoutCloseReason) => void;
  ruleTypeId?: string;
  canChangeTrigger?: boolean;
  initialValues?: Partial<Rule>;
  /** @deprecated use `onSave` as a callback after an alert is saved*/
  reloadRules?: () => Promise<void>;
  onSave?: () => Promise<void>;
  metadata?: MetaData;
  ruleTypeIndex?: RuleTypeIndex;
  filteredSolutions?: string[] | undefined;
}

export enum Percentiles {
  P50 = 'P50',
  P95 = 'P95',
  P99 = 'P99',
}

export interface TriggersActionsUiConfig {
  minimumScheduleInterval?: {
    value: string;
    enforce: boolean;
  };
}

export type AlertsData = Record<string, any[]>;

export interface FetchAlertData {
  activePage: number;
  alerts: AlertsData[];
  alertsCount: number;
  isInitializing: boolean;
  isLoading: boolean;
  getInspectQuery: () => { request: {}; response: {} };
  onColumnsChange: (columns: EuiDataGridControlColumn[]) => void;
  onPageChange: (pagination: RuleRegistrySearchRequestPagination) => void;
  onSortChange: (sort: Array<{ id: string; direction: 'asc' | 'desc' }>) => void;
  refresh: () => void;
}

export interface BulkActionsObjectProp {
  alertStatusActions?: boolean;
  onAlertStatusActionSuccess?: void;
  onAlertStatusActionFailure?: void;
}

export interface AlertsTableProps {
  consumers: AlertConsumers[];
  bulkActions: BulkActionsObjectProp;
  columns: EuiDataGridColumn[];
  // defaultCellActions: TGridCellAction[];
  deletedEventIds: string[];
  disabledCellActions: string[];
  pageSize: number;
  pageSizeOptions: number[];
  leadingControlColumns: EuiDataGridControlColumn[];
  renderCellValue: (props: EuiDataGridCellValueElementProps) => React.ReactNode;
  showCheckboxes: boolean;
  trailingControlColumns: EuiDataGridControlColumn[];
  useFetchAlertsData: () => FetchAlertData;
  'data-test-subj': string;
}
