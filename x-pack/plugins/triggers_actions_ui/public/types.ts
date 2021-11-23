/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DocLinksStart } from 'kibana/public';
import { ComponentType } from 'react';
import { ChartsPluginSetup } from 'src/plugins/charts/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { IconType } from '@elastic/eui';
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
  AlertActionParam,
  SanitizedAlert,
  ResolvedSanitizedRule,
  AlertAction,
  AlertAggregations,
  AlertTaskState,
  AlertInstanceSummary,
  ExecutionDuration,
  AlertInstanceStatus,
  RawAlertInstance,
  AlertingFrameworkHealth,
  AlertNotifyWhenType,
  AlertTypeParams,
  ActionVariable,
  AlertType as CommonAlertType,
} from '../../alerting/common';

// In Triggers and Actions we treat all `Alert`s as `SanitizedAlert<AlertTypeParams>`
// so the `Params` is a black-box of Record<string, unknown>
type Alert = SanitizedAlert<AlertTypeParams>;
type ResolvedRule = ResolvedSanitizedRule<AlertTypeParams>;

export type {
  Alert,
  AlertAction,
  AlertAggregations,
  AlertTaskState,
  AlertInstanceSummary,
  AlertInstanceStatus,
  ExecutionDuration,
  RawAlertInstance,
  AlertingFrameworkHealth,
  AlertNotifyWhenType,
  AlertTypeParams,
  ResolvedRule,
};
export type { ActionType, AsApiContract };
export {
  AlertHistoryEsIndexConnectorId,
  AlertHistoryDocumentTemplate,
  AlertHistoryDefaultIndexName,
  ALERT_HISTORY_PREFIX,
};

export type ActionTypeIndex = Record<string, ActionType>;
export type RuleTypeIndex = Map<string, AlertType>;
export type ActionTypeRegistryContract<
  ActionConnector = unknown,
  ActionParams = unknown
> = PublicMethodsOf<TypeRegistry<ActionTypeModel<ActionConnector, ActionParams>>>;
export type RuleTypeRegistryContract = PublicMethodsOf<TypeRegistry<AlertTypeModel>>;

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

export enum AlertFlyoutCloseReason {
  SAVED,
  CANCELED,
}

export interface ActionParamsProps<TParams> {
  actionParams: Partial<TParams>;
  index: number;
  editAction: (key: string, value: AlertActionParam, index: number) => void;
  errors: IErrorObject;
  messageVariables?: ActionVariable[];
  defaultMessage?: string;
  actionConnector?: ActionConnector;
}

export interface Pagination {
  index: number;
  size: number;
}

export interface Sorting {
  field: string;
  direction: string;
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
export const REQUIRED_ACTION_VARIABLES = ['state', 'params'] as const;
export const OPTIONAL_ACTION_VARIABLES = ['context'] as const;
export type ActionVariables = AsActionVariables<typeof REQUIRED_ACTION_VARIABLES[number]> &
  Partial<AsActionVariables<typeof OPTIONAL_ACTION_VARIABLES[number]>>;

export interface AlertType<
  ActionGroupIds extends string = string,
  RecoveryActionGroupId extends string = string
> extends Pick<
    CommonAlertType<ActionGroupIds, RecoveryActionGroupId>,
    | 'id'
    | 'name'
    | 'actionGroups'
    | 'producer'
    | 'minimumLicenseRequired'
    | 'recoveryActionGroup'
    | 'defaultActionGroupId'
    | 'ruleTaskTimeout'
    | 'defaultScheduleInterval'
    | 'minimumScheduleInterval'
  > {
  actionVariables: ActionVariables;
  authorizedConsumers: Record<string, { read: boolean; all: boolean }>;
  enabledInLicense: boolean;
}

export type SanitizedAlertType = Omit<AlertType, 'apiKey'>;

export type AlertUpdates = Omit<Alert, 'id' | 'executionStatus'>;

export interface AlertTableItem extends Alert {
  alertType: AlertType['name'];
  index: number;
  actionsCount: number;
  isEditable: boolean;
  enabledInLicense: boolean;
}

export interface AlertTypeParamsExpressionProps<
  Params extends AlertTypeParams = AlertTypeParams,
  MetaData = Record<string, unknown>,
  ActionGroupIds extends string = string
> {
  alertParams: Params;
  alertInterval: string;
  alertThrottle: string;
  alertNotifyWhen: AlertNotifyWhenType;
  setAlertParams: <Key extends keyof Params>(property: Key, value: Params[Key] | undefined) => void;
  setAlertProperty: <Prop extends keyof Alert>(
    key: Prop,
    value: SanitizedAlert<Params>[Prop] | null
  ) => void;
  errors: IErrorObject;
  defaultActionGroupId: string;
  actionGroups: Array<ActionGroup<ActionGroupIds>>;
  metadata?: MetaData;
  charts: ChartsPluginSetup;
  data: DataPublicPluginStart;
}

export interface AlertTypeModel<Params extends AlertTypeParams = AlertTypeParams> {
  id: string;
  description: string;
  iconClass: string;
  documentationUrl: string | ((docLinks: DocLinksStart) => string) | null;
  validate: (alertParams: Params) => ValidationResult;
  alertParamsExpression:
    | React.FunctionComponent<any>
    | React.LazyExoticComponent<ComponentType<AlertTypeParamsExpressionProps<Params>>>;
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

export interface AlertEditProps<MetaData = Record<string, any>> {
  initialAlert: Alert;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: (reason: AlertFlyoutCloseReason) => void;
  /** @deprecated use `onSave` as a callback after an alert is saved*/
  reloadAlerts?: () => Promise<void>;
  onSave?: () => Promise<void>;
  metadata?: MetaData;
  ruleType?: AlertType<string, string>;
}

export interface AlertAddProps<MetaData = Record<string, any>> {
  consumer: string;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: (reason: AlertFlyoutCloseReason) => void;
  alertTypeId?: string;
  canChangeTrigger?: boolean;
  initialValues?: Partial<Alert>;
  /** @deprecated use `onSave` as a callback after an alert is saved*/
  reloadAlerts?: () => Promise<void>;
  onSave?: () => Promise<void>;
  metadata?: MetaData;
  ruleTypeIndex?: RuleTypeIndex;
}
