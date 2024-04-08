/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import type { ComponentType, ReactNode, RefObject } from 'react';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DocLinksStart } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type {
  IconType,
  RecursivePartial,
  EuiDataGridCellValueElementProps,
  EuiDataGridToolBarAdditionalControlsOptions,
  EuiDataGridProps,
  EuiDataGridRefProps,
  EuiDataGridColumnCellAction,
  EuiDataGridToolBarVisibilityOptions,
  EuiSuperSelectOption,
  EuiDataGridOnColumnResizeHandler,
  EuiDataGridCellPopoverElementProps,
} from '@elastic/eui';
import type { RuleCreationValidConsumer, ValidFeatureId } from '@kbn/rule-data-utils';
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
  RuleSystemAction,
  RuleTaskState,
  AlertSummary as RuleSummary,
  ExecutionDuration,
  AlertStatus,
  RawAlertInstance,
  AlertingFrameworkHealth,
  RuleNotifyWhenType,
  RuleTypeParams,
  RuleTypeMetaData,
  ActionVariable,
  RuleLastRun,
  MaintenanceWindow,
  SanitizedRuleAction as RuleAction,
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
import type { RuleType, RuleTypeIndex } from '@kbn/triggers-actions-ui-types';
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
import type { GlobalRuleEventLogListProps } from './application/sections/rule_details/components/global_rule_event_log_list';
import type { AlertSummaryTimeRange } from './application/sections/alert_summary_widget/types';
import type { CreateConnectorFlyoutProps } from './application/sections/action_connector_form/create_connector_flyout';
import type { EditConnectorFlyoutProps } from './application/sections/action_connector_form/edit_connector_flyout';
import type {
  FieldBrowserOptions,
  CreateFieldComponent,
  GetFieldTableColumns,
  FieldBrowserProps,
  BrowserFieldItem,
} from './application/sections/field_browser/types';
import { RulesListVisibleColumns } from './application/sections/rules_list/components/rules_list_column_selector';
import { TimelineItem } from './application/sections/alerts_table/bulk_actions/components/toolbar';
import type { RulesListNotifyBadgePropsWithApi } from './application/sections/rules_list/components/notify_badge';
import { Case } from './application/sections/alerts_table/hooks/apis/bulk_get_cases';
import { AlertTableConfigRegistry } from './application/alert_table_config_registry';

export type { ActionVariables, RuleType, RuleTypeIndex } from '@kbn/triggers-actions-ui-types';

export {
  REQUIRED_ACTION_VARIABLES,
  CONTEXT_ACTION_VARIABLES,
  OPTIONAL_ACTION_VARIABLES,
} from '@kbn/triggers-actions-ui-types';

type RuleUiAction = RuleAction | RuleSystemAction;

// In Triggers and Actions we treat all `Alert`s as `SanitizedRule<RuleTypeParams>`
// so the `Params` is a black-box of Record<string, unknown>
type SanitizedRule<Params extends RuleTypeParams = never> = Omit<
  AlertingSanitizedRule<Params>,
  'alertTypeId' | 'actions' | 'systemActions'
> & {
  ruleTypeId: AlertingSanitizedRule['alertTypeId'];
  actions: RuleUiAction[];
};
type Rule<Params extends RuleTypeParams = RuleTypeParams> = SanitizedRule<Params>;
type ResolvedRule = Omit<
  ResolvedSanitizedRule<RuleTypeParams>,
  'alertTypeId' | 'actions' | 'systemActions'
> & {
  ruleTypeId: ResolvedSanitizedRule['alertTypeId'];
  actions: RuleUiAction[];
};

export type {
  Rule,
  RuleAction,
  RuleSystemAction,
  RuleUiAction,
  RuleTaskState,
  RuleSummary,
  ExecutionDuration,
  AlertStatus,
  RawAlertInstance,
  AlertingFrameworkHealth,
  RuleNotifyWhenType,
  RuleTypeParams,
  RuleTypeMetaData,
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
  GlobalRuleEventLogListProps,
  RulesListProps,
  CreateConnectorFlyoutProps,
  EditConnectorFlyoutProps,
  RulesListNotifyBadgePropsWithApi,
  FieldBrowserProps,
  FieldBrowserOptions,
  CreateFieldComponent,
  GetFieldTableColumns,
  BrowserFieldItem,
  RulesListVisibleColumns,
  AlertSummaryTimeRange,
};
export type { ActionType, AsApiContract };
export {
  AlertHistoryEsIndexConnectorId,
  AlertHistoryDocumentTemplate,
  AlertHistoryDefaultIndexName,
  ALERT_HISTORY_PREFIX,
};

export type ActionTypeIndex = Record<string, ActionType>;
export type ActionTypeRegistryContract<
  ActionConnector = unknown,
  ActionParams = unknown
> = PublicMethodsOf<TypeRegistry<ActionTypeModel<ActionConnector, ActionParams>>>;
export type RuleTypeRegistryContract = PublicMethodsOf<TypeRegistry<RuleTypeModel>>;
export type AlertsTableConfigurationRegistryContract = PublicMethodsOf<AlertTableConfigRegistry>;

export interface ConnectorValidationError {
  message: ReactNode;
}

export type ConnectorValidationFunc = () => Promise<ConnectorValidationError | void | undefined>;
export interface ActionConnectorFieldsProps {
  readOnly: boolean;
  isEdit: boolean;
  registerPreSubmitValidator: (validator: ConnectorValidationFunc) => void;
}
export interface ActionReadOnlyElementProps {
  connectorId: string;
  connectorName: string;
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

export type BulkDisableParamsWithoutHttp = BulkOperationAttributesWithoutHttp & {
  untrack: boolean;
};

export type BulkDisableParams = BulkDisableParamsWithoutHttp & {
  http: HttpSetup;
};

export interface ActionParamsProps<TParams> {
  actionParams: Partial<TParams>;
  index: number;
  editAction: (key: string, value: RuleActionParam, index: number) => void;
  errors: IErrorObject;
  ruleTypeId?: string;
  messageVariables?: ActionVariable[];
  defaultMessage?: string;
  useDefaultMessage?: boolean;
  actionConnector?: ActionConnector;
  isLoading?: boolean;
  isDisabled?: boolean;
  selectedActionGroupId?: string;
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
  actionReadOnlyExtraComponent?: React.LazyExoticComponent<
    ComponentType<ActionReadOnlyElementProps>
  >;
  defaultActionParams?: RecursivePartial<ActionParams>;
  defaultRecoveredActionParams?: RecursivePartial<ActionParams>;
  customConnectorSelectItem?: CustomConnectorSelectionItem;
  isExperimental?: boolean;
  subtype?: Array<{ id: string; name: string }>;
  convertParamsBetweenGroups?: (params: ActionParams) => ActionParams | {};
  hideInUi?: boolean;
  modalWidth?: number;
  isSystemActionType?: boolean;
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
  isSystemAction: boolean;
  isMissingSecrets?: boolean;
}

export type PreConfiguredActionConnector = Omit<
  ActionConnectorProps<never, never>,
  'config' | 'secrets'
> & {
  isPreconfigured: true;
  isSystemAction: false;
};

export type UserConfiguredActionConnector<Config, Secrets> = ActionConnectorProps<
  Config,
  Secrets
> & {
  isPreconfigured: false;
  isSystemAction: false;
};

export type SystemAction = Omit<ActionConnectorProps<never, never>, 'config' | 'secrets'> & {
  isSystemAction: true;
  isPreconfigured: false;
};

export type ActionConnector<Config = Record<string, unknown>, Secrets = Record<string, unknown>> =
  | PreConfiguredActionConnector
  | SystemAction
  | UserConfiguredActionConnector<Config, Secrets>;

export type ActionConnectorWithoutId<
  Config = Record<string, unknown>,
  Secrets = Record<string, unknown>
> = Omit<UserConfiguredActionConnector<Config, Secrets>, 'id'>;

export type ActionConnectorTableItem = ActionConnector & {
  actionType: ActionType['name'];
  compatibility: string[];
};

export type SanitizedRuleType = Omit<RuleType, 'apiKey'>;

export type RuleUpdates = Omit<Rule, 'id' | 'executionStatus' | 'lastRun' | 'nextRun'>;

export type RuleSnoozeSettings = Pick<
  Rule,
  'activeSnoozes' | 'isSnoozedUntil' | 'muteAll' | 'snoozeSchedule'
>;

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
  id?: string;
  ruleParams: Params;
  ruleInterval: string;
  ruleThrottle: string;
  alertNotifyWhen: RuleNotifyWhenType;
  setRuleParams: <Key extends keyof Params>(property: Key, value: Params[Key] | undefined) => void;
  /**
   * @deprecated Use setRuleParams instead.
   * Expression components should never set any properties besides params.
   */
  setRuleProperty: <Prop extends keyof Rule>(
    key: 'params',
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

export type RuleParamsForRules = Record<
  string,
  Array<{ label: string; value: string | number | object }>
>;

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
  defaultSummaryMessage?: string;
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
  Rules = 'rules',
}

export interface RuleEditProps<
  Params extends RuleTypeParams = RuleTypeParams,
  MetaData extends RuleTypeMetaData = RuleTypeMetaData
> {
  initialRule: Rule<Params>;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: (reason: RuleFlyoutCloseReason, metadata?: MetaData) => void;
  /** @deprecated use `onSave` as a callback after an alert is saved*/
  reloadRules?: () => Promise<void>;
  hideInterval?: boolean;
  onSave?: (metadata?: MetaData) => Promise<void>;
  metadata?: MetaData;
  ruleType?: RuleType<string, string>;
}

export interface RuleAddProps<
  Params extends RuleTypeParams = RuleTypeParams,
  MetaData extends RuleTypeMetaData = RuleTypeMetaData
> {
  /**
   * ID of the feature this rule should be created for.
   *
   * Notes:
   * - The feature needs to be registered using `featuresPluginSetup.registerKibanaFeature()` API during your plugin's setup phase.
   * - The user needs to have permission to access the feature in order to create the rule.
   * */
  consumer: string;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: (reason: RuleFlyoutCloseReason, metadata?: MetaData) => void;
  ruleTypeId?: string;
  /**
   * Determines whether the user should be able to change the rule type in the UI.
   */
  canChangeTrigger?: boolean;
  initialValues?: Partial<Rule<Params>>;
  /** @deprecated use `onSave` as a callback after an alert is saved*/
  reloadRules?: () => Promise<void>;
  hideGrouping?: boolean;
  hideInterval?: boolean;
  onSave?: (metadata?: MetaData) => Promise<void>;
  metadata?: MetaData;
  ruleTypeIndex?: RuleTypeIndex;
  filteredRuleTypes?: string[];
  validConsumers?: RuleCreationValidConsumer[];
  useRuleProducer?: boolean;
  initialSelectedConsumer?: RuleCreationValidConsumer | null;
}
export interface RuleDefinitionProps<Params extends RuleTypeParams = RuleTypeParams> {
  rule: Rule<Params>;
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
  case_ids = 'kibana.alert.case_ids',
}

export interface InspectQuery {
  request: string[];
  response: string[];
}
export type GetInspectQuery = () => InspectQuery;

export type Alert = EcsFieldsResponse;
export type Alerts = Alert[];

export interface FetchAlertData {
  activePage: number;
  alerts: Alerts;
  alertsCount: number;
  isInitializing: boolean;
  isLoading: boolean;
  getInspectQuery: GetInspectQuery;
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
  cases: {
    data: Map<string, Case>;
    isLoading: boolean;
  };
  maintenanceWindows: {
    data: Map<string, MaintenanceWindow>;
    isLoading: boolean;
  };
  columns: EuiDataGridColumn[];
  // defaultCellActions: TGridCellAction[];
  deletedEventIds: string[];
  disabledCellActions: string[];
  pageSize: number;
  pageSizeOptions: number[];
  id?: string;
  leadingControlColumns: EuiDataGridControlColumn[];
  showAlertStatusWithFlapping?: boolean;
  trailingControlColumns: EuiDataGridControlColumn[];
  useFetchAlertsData: () => FetchAlertData;
  visibleColumns: string[];
  'data-test-subj': string;
  updatedAt: number;
  browserFields: any;
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  onChangeVisibleColumns: (newColumns: string[]) => void;
  onColumnResize?: EuiDataGridOnColumnResizeHandler;
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  controls?: EuiDataGridToolBarAdditionalControlsOptions;
  showInspectButton?: boolean;
  toolbarVisibility?: EuiDataGridToolBarVisibilityOptions;
  /**
   * Allows to consumers of the table to decide to highlight a row based on the current alert.
   */
  shouldHighlightRow?: (alert: Alert) => boolean;
  /**
   * Enable when rows may have variable heights (disables virtualization)
   */
  dynamicRowHeight?: boolean;
  featureIds?: ValidFeatureId[];
  renderCellPopover?: ReturnType<GetRenderCellPopover>;
} & Partial<Pick<EuiDataGridProps, 'gridStyle' | 'rowHeightsOptions'>>;

export type SetFlyoutAlert = (alertId: string) => void;

export interface TimelineNonEcsData {
  field: string;
  value?: string[] | null;
}

// TODO We need to create generic type between our plugin, right now we have different one because of the old alerts table
export type GetRenderCellValue<T = unknown> = ({
  setFlyoutAlert,
  context,
}: {
  setFlyoutAlert: SetFlyoutAlert;
  context?: T;
}) => (
  props: EuiDataGridCellValueElementProps & { data: TimelineNonEcsData[] }
) => React.ReactNode | JSX.Element;

export type GetRenderCellPopover<T = unknown> = ({
  context,
}: {
  context?: T;
}) => (
  props: EuiDataGridCellPopoverElementProps & { alert: Alert }
) => React.ReactNode | JSX.Element;

export type PreFetchPageContext<T = unknown> = ({
  alerts,
  columns,
}: {
  alerts: Alerts;
  columns: EuiDataGridColumn[];
}) => T;

export type AlertTableFlyoutComponent =
  | React.FunctionComponent<AlertsTableFlyoutBaseProps>
  | React.LazyExoticComponent<ComponentType<AlertsTableFlyoutBaseProps>>
  | null;

export interface AlertsTableFlyoutBaseProps {
  alert: Alert;
  isLoading: boolean;
  id?: string;
}

export interface BulkActionsConfig {
  label: string;
  key: string;
  'data-test-subj'?: string;
  disableOnQuery: boolean;
  disabledLabel?: string;
  onClick?: (
    selectedIds: TimelineItem[],
    isAllSelected: boolean,
    setIsBulkActionsLoading: (isLoading: boolean) => void,
    clearSelection: () => void,
    refresh: () => void
  ) => void;
  panel?: number;
}

interface PanelConfig {
  id: number;
  title?: JSX.Element | string;
  'data-test-subj'?: string;
}

export interface RenderContentPanelProps {
  alertItems: TimelineItem[];
  setIsBulkActionsLoading: (isLoading: boolean) => void;
  isAllSelected?: boolean;
  clearSelection?: () => void;
  refresh?: () => void;
  closePopoverMenu: () => void;
}

interface ContentPanelConfig extends PanelConfig {
  renderContent: (args: RenderContentPanelProps) => JSX.Element;
  items?: never;
}

interface ItemsPanelConfig extends PanelConfig {
  content?: never;
  items: BulkActionsConfig[];
}

export type BulkActionsPanelConfig = ItemsPanelConfig | ContentPanelConfig;

export type UseBulkActionsRegistry = (
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>
) => BulkActionsPanelConfig[];

export type UseCellActions = (props: {
  columns: EuiDataGridColumn[];
  data: unknown[][];
  dataGridRef: RefObject<EuiDataGridRefProps>;
  ecsData: unknown[];
  pageSize: number;
  pageIndex: number;
}) => {
  // getCellAction function for system to return cell actions per Id
  getCellActions: (columnId: string, columnIndex: number) => EuiDataGridColumnCellAction[];
  visibleCellActions?: number;
  disabledCellActions?: string[];
};

export interface RenderCustomActionsRowArgs {
  ecsAlert: FetchAlertData['ecsAlertsData'][number];
  nonEcsData: FetchAlertData['oldAlertsData'][number];
  rowIndex: number;
  cveProps: EuiDataGridCellValueElementProps;
  alert: Alert;
  setFlyoutAlert: (alertId: string) => void;
  id?: string;
  setIsActionLoading?: (isLoading: boolean) => void;
  refresh: () => void;
  clearSelection: () => void;
}

export interface AlertActionsProps extends RenderCustomActionsRowArgs {
  onActionExecuted?: () => void;
  isAlertDetailsEnabled?: boolean;
  /**
   * Implement this to resolve your app's specific rule page path, return null to avoid showing the link
   */
  resolveRulePagePath?: (ruleId: string, currentPageId: string) => string | null;
  /**
   * Implement this to resolve your app's specific alert page path, return null to avoid showing the link
   */
  resolveAlertPagePath?: (alertId: string, currentPageId: string) => string | null;
}

export type UseActionsColumnRegistry = () => {
  renderCustomActionsRow: (args: RenderCustomActionsRowArgs) => JSX.Element;
  width?: number;
};

export interface UseFieldBrowserOptionsArgs {
  onToggleColumn: (columnId: string) => void;
}

export type UseFieldBrowserOptions = (args: UseFieldBrowserOptionsArgs) => FieldBrowserOptions;

export interface AlertsTableConfigurationRegistry {
  id: string;
  cases?: {
    featureId: string;
    owner: string[];
    appId?: string;
    syncAlerts?: boolean;
  };
  columns: EuiDataGridColumn[];
  useInternalFlyout?: () => {
    header: AlertTableFlyoutComponent;
    body: AlertTableFlyoutComponent;
    footer: AlertTableFlyoutComponent;
  };
  sort?: SortCombinations[];
  getRenderCellValue?: GetRenderCellValue;
  getRenderCellPopover?: GetRenderCellPopover;
  useActionsColumn?: UseActionsColumnRegistry;
  useBulkActions?: UseBulkActionsRegistry;
  useCellActions?: UseCellActions;
  usePersistentControls?: () => {
    right?: ReactNode;
  };
  useFieldBrowserOptions?: UseFieldBrowserOptions;
  showInspectButton?: boolean;
  ruleTypeIds?: string[];
  useFetchPageContext?: PreFetchPageContext;
}

export interface AlertsTableConfigurationRegistryWithActions
  extends AlertsTableConfigurationRegistry {
  actions: {
    toggleColumn: (columnId: string) => void;
  };
}

export enum BulkActionsVerbs {
  add = 'add',
  delete = 'delete',
  clear = 'clear',
  selectCurrentPage = 'selectCurrentPage',
  selectAll = 'selectAll',
  rowCountUpdate = 'rowCountUpdate',
  updateRowLoadingState = 'updateRowLoadingState',
  updateAllLoadingState = 'updateAllLoadingState',
}

export interface BulkActionsReducerAction {
  action: BulkActionsVerbs;
  rowIndex?: number;
  rowCount?: number;
  isLoading?: boolean;
}

export interface BulkActionsState {
  rowSelection: Map<number, RowSelectionState>;
  isAllSelected: boolean;
  areAllVisibleRowsSelected: boolean;
  rowCount: number;
}

export type RowSelection = Map<number, RowSelectionState>;

export interface RowSelectionState {
  isLoading: boolean;
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
  actionTypes?: string[];
  ruleExecutionStatuses?: string[];
  ruleLastRunOutcomes?: string[];
  ruleParams?: Record<string, string | number | object>;
  ruleStatuses?: RuleStatus[];
  searchText?: string;
  tags?: string[];
  types?: string[];
  kueryNode?: KueryNode;
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
    }
  | {
      filter: 'ruleParams';
      value: Record<string, string | number | object>;
    }
  | {
      filter: 'kueryNode';
      value: KueryNode;
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

export interface TableUpdateHandlerArgs {
  totalCount: number;
  isLoading: boolean;
  refresh: () => void;
}

export interface LazyLoadProps {
  hideLazyLoader?: boolean;
}

export interface NotifyWhenSelectOptions {
  isSummaryOption?: boolean;
  isForEachAlertOption?: boolean;
  value: EuiSuperSelectOption<RuleNotifyWhenType>;
}

export type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
