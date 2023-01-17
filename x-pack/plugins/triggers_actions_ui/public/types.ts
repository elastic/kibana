/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import type { ComponentType, ReactNode } from 'react';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DocLinksStart } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type {
  IconType,
  EuiFlyoutSize,
  RecursivePartial,
  EuiDataGridCellValueElementProps,
  EuiDataGridToolBarAdditionalControlsOptions,
  EuiDataGridProps,
} from '@elastic/eui';
import { EuiDataGridColumn, EuiDataGridControlColumn, EuiDataGridSorting } from '@elastic/eui';
import { HttpSetup } from '@kbn/core/public';
import { KueryNode } from '@kbn/es-query';
import {
  ActionType,
  AlertHistoryEsIndexConnectorId,
  AlertHistoryDocumentTemplate,
  ALERT_HISTORY_PREFIX,
  AlertHistoryDefaultIndexName,
  AsApiContract,
} from '@kbn/actions-plugin/common';
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
  RuleLastRun,
} from '@kbn/alerting-plugin/common';
import type { BulkOperationError } from '@kbn/alerting-plugin/server';
import { RuleRegistrySearchRequestPagination } from '@kbn/rule-registry-plugin/common';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import {
  QueryDslQueryContainer,
  SortCombinations,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React from 'react';
import { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import { TypeRegistry } from './application/type_registry';
import type { ComponentOpts as RuleStatusDropdownProps } from './application/sections/rules_list/components/rule_status_dropdown';
import type { RuleTagFilterProps } from './application/sections/rules_list/components/rule_tag_filter';
import type { RuleStatusFilterProps } from './application/sections/rules_list/components/rule_status_filter';
import type { RulesListProps } from './application/sections/rules_list/components/rules_list';
import type {
  RuleTagBadgeProps,
  RuleTagBadgeOptions,
} from './application/sections/rules_list/components/rule_tag_badge';
import type {
  RuleEventLogListProps,
  RuleEventLogListOptions,
} from './application/sections/rule_details/components/rule_event_log_list';
import type { CreateConnectorFlyoutProps } from './application/sections/action_connector_form/create_connector_flyout';
import type { EditConnectorFlyoutProps } from './application/sections/action_connector_form/edit_connector_flyout';
import type { RulesListNotifyBadgeProps } from './application/sections/rules_list/components/rules_list_notify_badge';
import type {
  FieldBrowserOptions,
  CreateFieldComponent,
  GetFieldTableColumns,
  FieldBrowserProps,
  BrowserFieldItem,
} from './application/sections/field_browser/types';
import { RulesListVisibleColumns } from './application/sections/rules_list/components/rules_list_column_selector';
import { TimelineItem } from './application/sections/alerts_table/bulk_actions/components/toolbar';

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
  RuleStatusDropdownProps,
  RuleTagFilterProps,
  RuleStatusFilterProps,
  RuleLastRun,
  RuleTagBadgeProps,
  RuleTagBadgeOptions,
  RuleEventLogListProps,
  RuleEventLogListOptions,
  RulesListProps,
  CreateConnectorFlyoutProps,
  EditConnectorFlyoutProps,
  RulesListNotifyBadgeProps,
  FieldBrowserProps,
  FieldBrowserOptions,
  CreateFieldComponent,
  GetFieldTableColumns,
  BrowserFieldItem,
  RulesListVisibleColumns,
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
export type AlertsTableConfigurationRegistryContract = PublicMethodsOf<
  TypeRegistry<AlertsTableConfigurationRegistry>
>;

export interface ConnectorValidationError {
  message: ReactNode;
}

export type ConnectorValidationFunc = () => Promise<ConnectorValidationError | void | undefined>;
export interface ActionConnectorFieldsProps {
  readOnly: boolean;
  isEdit: boolean;
  registerPreSubmitValidator: (validator: ConnectorValidationFunc) => void;
}

export enum RuleFlyoutCloseReason {
  SAVED,
  CANCELED,
}

export interface BulkEditResponse {
  rules: Rule[];
  errors: BulkOperationError[];
  total: number;
}

export enum ActionConnectorMode {
  Test = 'test',
  ActionForm = 'actionForm',
}

export interface BulkOperationResponse {
  rules: Rule[];
  errors: BulkOperationError[];
  total: number;
}

interface BulkOperationAttributesByIds {
  ids: string[];
  filter?: never;
}
interface BulkOperationAttributesByFilter {
  ids?: never;
  filter: KueryNode | null;
}
export type BulkOperationAttributesWithoutHttp =
  | BulkOperationAttributesByIds
  | BulkOperationAttributesByFilter;

export type BulkOperationAttributes = BulkOperationAttributesWithoutHttp & {
  http: HttpSetup;
};

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
  executionMode?: ActionConnectorMode;
  onBlur?: (field?: string) => void;
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
  validateParams: (
    actionParams: ActionParams
  ) => Promise<GenericValidationResult<Partial<ActionParams> | unknown>>;
  actionConnectorFields: React.LazyExoticComponent<
    ComponentType<ActionConnectorFieldsProps>
  > | null;
  actionParamsFields: React.LazyExoticComponent<ComponentType<ActionParamsProps<ActionParams>>>;
  defaultActionParams?: RecursivePartial<ActionParams>;
  defaultRecoveredActionParams?: RecursivePartial<ActionParams>;
  customConnectorSelectItem?: CustomConnectorSelectionItem;
  isExperimental?: boolean;
}

export interface GenericValidationResult<T> {
  errors: Record<Extract<keyof T, string>, string[] | unknown>;
}

export interface ValidationResult {
  errors: Record<string, any>;
}

export interface ActionConnectorProps<Config, Secrets> {
  secrets: Secrets;
  id: string;
  actionTypeId: string;
  name: string;
  referencedByCount?: number;
  config: Config;
  isPreconfigured: boolean;
  isDeprecated: boolean;
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
  compatibility: string[];
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

export type RuleUpdates = Omit<Rule, 'id' | 'executionStatus' | 'lastRun' | 'nextRun'>;

export interface RuleTableItem extends Rule {
  ruleType: RuleType['name'];
  index: number;
  actionsCount: number;
  isEditable: boolean;
  enabledInLicense: boolean;
  showIntervalWarning?: boolean;
  activeSnoozes?: string[];
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
  onChangeMetaData: (metadata: MetaData) => void;
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
  defaultRecoveryMessage?: string;
  alertDetailsAppSection?:
    | React.FunctionComponent<any>
    | React.LazyExoticComponent<ComponentType<any>>;
}

export interface IErrorObject {
  [key: string]: string | string[] | IErrorObject;
}

export enum EditConnectorTabs {
  Configuration = 'configuration',
  Test = 'test',
}

export interface RuleEditProps<MetaData = Record<string, any>> {
  initialRule: Rule;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: (reason: RuleFlyoutCloseReason, metadata?: MetaData) => void;
  /** @deprecated use `onSave` as a callback after an alert is saved*/
  reloadRules?: () => Promise<void>;
  onSave?: (metadata?: MetaData) => Promise<void>;
  metadata?: MetaData;
  ruleType?: RuleType<string, string>;
}

export interface RuleAddProps<MetaData = Record<string, any>> {
  consumer: string;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: (reason: RuleFlyoutCloseReason, metadata?: MetaData) => void;
  ruleTypeId?: string;
  canChangeTrigger?: boolean;
  initialValues?: Partial<Rule>;
  /** @deprecated use `onSave` as a callback after an alert is saved*/
  reloadRules?: () => Promise<void>;
  onSave?: (metadata?: MetaData) => Promise<void>;
  metadata?: MetaData;
  ruleTypeIndex?: RuleTypeIndex;
  filteredRuleTypes?: string[];
}
export interface RuleDefinitionProps {
  rule: Rule;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onEditRule: () => Promise<void>;
  hideEditButton?: boolean;
  filteredRuleTypes?: string[];
}

export enum Percentiles {
  P50 = 'P50',
  P95 = 'P95',
  P99 = 'P99',
}

export interface TriggersActionsUiConfig {
  isUsingSecurity: boolean;
  minimumScheduleInterval?: {
    value: string;
    enforce: boolean;
  };
}

export enum AlertsField {
  name = 'kibana.alert.rule.name',
  reason = 'kibana.alert.reason',
  uuid = 'kibana.alert.rule.uuid',
}

export interface FetchAlertData {
  activePage: number;
  alerts: EcsFieldsResponse[];
  alertsCount: number;
  isInitializing: boolean;
  isLoading: boolean;
  getInspectQuery: () => { request: {}; response: {} };
  onPageChange: (pagination: RuleRegistrySearchRequestPagination) => void;
  onSortChange: (sort: EuiDataGridSorting['columns']) => void;
  refresh: () => void;
  sort: SortCombinations[];
  /**
   * We need to have it because of lot code is expecting this format
   * @deprecated
   */
  oldAlertsData: Array<Array<{ field: string; value: string[] }>>;
  /**
   * We need to have it because of lot code is expecting this format
   * @deprecated
   */
  ecsAlertsData: unknown[];
}

export type AlertsTableProps = {
  alertsTableConfiguration: AlertsTableConfigurationRegistry;
  columns: EuiDataGridColumn[];
  // defaultCellActions: TGridCellAction[];
  deletedEventIds: string[];
  disabledCellActions: string[];
  flyoutSize?: EuiFlyoutSize;
  pageSize: number;
  pageSizeOptions: number[];
  id?: string;
  leadingControlColumns: EuiDataGridControlColumn[];
  showExpandToDetails: boolean;
  trailingControlColumns: EuiDataGridControlColumn[];
  useFetchAlertsData: () => FetchAlertData;
  visibleColumns: string[];
  'data-test-subj': string;
  updatedAt: number;
  browserFields: any;
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  onColumnsChange: (columns: EuiDataGridColumn[], visibleColumns: string[]) => void;
  onChangeVisibleColumns: (newColumns: string[]) => void;
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  controls?: EuiDataGridToolBarAdditionalControlsOptions;
} & Partial<Pick<EuiDataGridProps, 'gridStyle' | 'rowHeightsOptions'>>;

// TODO We need to create generic type between our plugin, right now we have different one because of the old alerts table
export type GetRenderCellValue = ({
  setFlyoutAlert,
}: {
  setFlyoutAlert?: (data: unknown) => void;
}) => (props: unknown) => React.ReactNode;

export type AlertTableFlyoutComponent =
  | React.FunctionComponent<AlertsTableFlyoutBaseProps>
  | React.LazyExoticComponent<ComponentType<AlertsTableFlyoutBaseProps>>
  | null;

export interface AlertsTableFlyoutBaseProps {
  alert: EcsFieldsResponse;
  isLoading: boolean;
  id?: string;
}

export interface BulkActionsConfig {
  label: string;
  key: string;
  'data-test-subj'?: string;
  disableOnQuery: boolean;
  disabledLabel?: string;
  onClick: (
    selectedIds: TimelineItem[],
    isAllSelected: boolean,
    refresh: () => void
  ) => void | Promise<void>;
}

export type UseBulkActionsRegistry = (
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>
) => BulkActionsConfig[];

export type UseCellActions = (props: {
  columns: EuiDataGridColumn[];
  data: unknown[][];
  dataGridRef?: EuiDataGridRefProps;
  ecsData: unknown[];
  pageSize: number;
}) => {
  cellActions: EuiDataGridColumnCellAction[];
  visibleCellActions?: number;
  disabledCellActions?: string[];
};

export interface RenderCustomActionsRowProps {
  alert: FetchAlertData['ecsAlertsData'][number];
  nonEcsData: FetchAlertData['oldAlertsData'][number];
  rowIndex: number;
  cveProps: EuiDataGridCellValueElementProps;
  setFlyoutAlert: (data: unknown) => void;
  id?: string;
}

export interface AlertsTableConfigurationRegistry {
  id: string;
  casesFeatureId: string;
  columns: EuiDataGridColumn[];
  useInternalFlyout?: () => {
    header: AlertTableFlyoutComponent;
    body: AlertTableFlyoutComponent;
    footer: AlertTableFlyoutComponent;
  };
  sort?: SortCombinations[];
  getRenderCellValue?: GetRenderCellValue;
  useActionsColumn?: (
    ecsData?: FetchAlertData['ecsAlertsData'],
    oldAlertsData?: FetchAlertData['oldAlertsData']
  ) => {
    renderCustomActionsRow: (args: RenderCustomActionsRowProps) => JSX.Element;
    width?: number;
  };
  useBulkActions?: UseBulkActionsRegistry;
  useCellActions?: UseCellActions;
  usePersistentControls?: () => {
    right?: ReactNode;
  };
}

export enum BulkActionsVerbs {
  add = 'add',
  delete = 'delete',
  clear = 'clear',
  selectCurrentPage = 'selectCurrentPage',
  selectAll = 'selectAll',
  rowCountUpdate = 'rowCountUpdate',
}

export interface BulkActionsReducerAction {
  action: BulkActionsVerbs;
  rowIndex?: number;
  rowCount?: number;
}

export interface BulkActionsState {
  rowSelection: Set<number>;
  isAllSelected: boolean;
  areAllVisibleRowsSelected: boolean;
  rowCount: number;
}

export type RuleStatus = 'enabled' | 'disabled' | 'snoozed';

export enum RRuleFrequency {
  YEARLY = 0,
  MONTHLY = 1,
  WEEKLY = 2,
  DAILY = 3,
}

export interface RecurrenceSchedule {
  freq: RRuleFrequency;
  interval: number;
  until?: Moment;
  count?: number;
  byweekday?: string[];
  bymonthday?: number[];
  bymonth?: number[];
}

export interface SnoozeSchedule {
  id: string | null;
  duration: number;
  rRule: Partial<RecurrenceSchedule> & {
    dtstart: string;
    tzid: string;
  };
}

export interface ConnectorServices {
  validateEmailAddresses: ActionsPublicPluginSetup['validateEmailAddresses'];
}

export interface RulesListFilters {
  searchText: string;
  types: string[];
  actionTypes: string[];
  ruleExecutionStatuses: string[];
  ruleLastRunOutcomes: string[];
  ruleStatuses: RuleStatus[];
  tags: string[];
}

export type UpdateFiltersProps =
  | {
      filter: 'searchText';
      value: string;
    }
  | {
      filter: 'ruleStatuses';
      value: RuleStatus[];
    }
  | {
      filter: 'types' | 'actionTypes' | 'ruleExecutionStatuses' | 'ruleLastRunOutcomes' | 'tags';
      value: string[];
    };

export interface RulesPageContainerState {
  lastResponse: string[];
  status: RuleStatus[];
}

export type BulkEditActions =
  | 'snooze'
  | 'unsnooze'
  | 'schedule'
  | 'unschedule'
  | 'updateApiKey'
  | 'delete';

export interface UpdateRulesToBulkEditProps {
  action: BulkEditActions;
  rules?: RuleTableItem[];
  filter?: KueryNode | null;
}
