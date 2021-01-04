/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DocLinksStart } from 'kibana/public';
import { ComponentType } from 'react';
import { ChartsPluginSetup } from 'src/plugins/charts/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { ActionGroup, AlertActionParam, AlertTypeParams } from '../../alerts/common';
import { ActionType } from '../../actions/common';
import { TypeRegistry } from './application/type_registry';
import { AlertType as CommonAlertType } from '../../alerts/common';
import {
  SanitizedAlert,
  AlertAction,
  AlertAggregations,
  AlertTaskState,
  AlertInstanceSummary,
  AlertInstanceStatus,
  RawAlertInstance,
  AlertingFrameworkHealth,
  AlertNotifyWhenType,
} from '../../alerts/common';

// In Triggers and Actions we treat all `Alert`s as `SanitizedAlert<AlertTypeParams>`
// so the `Params` is a black-box of Record<string, unknown>
type Alert = SanitizedAlert<AlertTypeParams>;

export {
  Alert,
  AlertAction,
  AlertAggregations,
  AlertTaskState,
  AlertInstanceSummary,
  AlertInstanceStatus,
  RawAlertInstance,
  AlertingFrameworkHealth,
  AlertNotifyWhenType,
};
export { ActionType };

export type ActionTypeIndex = Record<string, ActionType>;
export type AlertTypeIndex = Map<string, AlertType>;
export type ActionTypeRegistryContract<ActionConnector = any, ActionParams = any> = PublicMethodsOf<
  TypeRegistry<ActionTypeModel<ActionConnector, ActionParams>>
>;
export type AlertTypeRegistryContract = PublicMethodsOf<TypeRegistry<AlertTypeModel>>;

export interface ActionConnectorFieldsProps<TActionConnector> {
  action: TActionConnector;
  editActionConfig: (property: string, value: any) => void;
  editActionSecrets: (property: string, value: any) => void;
  errors: IErrorObject;
  readOnly: boolean;
  consumer?: string;
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

export interface ActionTypeModel<ActionConfig = any, ActionSecrets = any, ActionParams = any> {
  id: string;
  iconClass: string;
  selectMessage: string;
  actionTypeTitle?: string;
  validateConnector: (
    connector: UserConfiguredActionConnector<ActionConfig, ActionSecrets>
  ) => ValidationResult;
  validateParams: (actionParams: any) => ValidationResult;
  actionConnectorFields: React.LazyExoticComponent<
    ComponentType<
      ActionConnectorFieldsProps<UserConfiguredActionConnector<ActionConfig, ActionSecrets>>
    >
  > | null;
  actionParamsFields: React.LazyExoticComponent<
    ComponentType<ActionParamsProps<ActionParams>>
  > | null;
}

export interface ValidationResult {
  errors: Record<string, any>;
}

interface ActionConnectorProps<Config, Secrets> {
  secrets: Secrets;
  id: string;
  actionTypeId: string;
  name: string;
  referencedByCount?: number;
  config: Config;
  isPreconfigured: boolean;
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

export type ActionConnector<Config = Record<string, any>, Secrets = Record<string, any>> =
  | PreConfiguredActionConnector
  | UserConfiguredActionConnector<Config, Secrets>;

export type ActionConnectorWithoutId<
  Config = Record<string, any>,
  Secrets = Record<string, any>
> = Omit<UserConfiguredActionConnector<Config, Secrets>, 'id'>;

export type ActionConnectorTableItem = ActionConnector & {
  actionType: ActionType['name'];
};

export interface ActionVariable {
  name: string;
  description: string;
  useWithTripleBracesInTemplates?: boolean;
}

type AsActionVariables<Keys extends string> = {
  [Req in Keys]: ActionVariable[];
};
export const REQUIRED_ACTION_VARIABLES = ['state', 'params'] as const;
export const OPTIONAL_ACTION_VARIABLES = ['context'] as const;
export type ActionVariables = AsActionVariables<typeof REQUIRED_ACTION_VARIABLES[number]> &
  Partial<AsActionVariables<typeof OPTIONAL_ACTION_VARIABLES[number]>>;

export interface AlertType
  extends Pick<
    CommonAlertType,
    | 'id'
    | 'name'
    | 'actionGroups'
    | 'producer'
    | 'minimumLicenseRequired'
    | 'recoveryActionGroup'
    | 'defaultActionGroupId'
  > {
  actionVariables: ActionVariables;
  authorizedConsumers: Record<string, { read: boolean; all: boolean }>;
  enabledInLicense: boolean;
}

export type SanitizedAlertType = Omit<AlertType, 'apiKey'>;

export type AlertUpdates = Omit<Alert, 'id' | 'executionStatus'>;

export interface AlertTableItem extends Alert {
  alertType: AlertType['name'];
  tagsText: string;
  isEditable: boolean;
  enabledInLicense: boolean;
}

export interface AlertTypeParamsExpressionProps<
  Params extends AlertTypeParams = AlertTypeParams,
  MetaData = Record<string, any>
> {
  alertParams: Params;
  alertInterval: string;
  alertThrottle: string;
  setAlertParams: <Key extends keyof Params>(property: Key, value: Params[Key] | undefined) => void;
  setAlertProperty: <Prop extends keyof Alert>(
    key: Prop,
    value: SanitizedAlert<Params>[Prop] | null
  ) => void;
  errors: IErrorObject;
  defaultActionGroupId: string;
  actionGroups: ActionGroup[];
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
