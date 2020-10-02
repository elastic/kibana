/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpSetup, DocLinksStart, ToastsSetup } from 'kibana/public';
import { ComponentType } from 'react';
import { ActionGroup } from '../../alerts/common';
import { ActionType } from '../../actions/common';
import { TypeRegistry } from './application/type_registry';
import {
  SanitizedAlert as Alert,
  AlertAction,
  AlertTaskState,
  AlertInstanceSummary,
  AlertInstanceStatus,
  RawAlertInstance,
  AlertingFrameworkHealth,
} from '../../alerts/common';
export {
  Alert,
  AlertAction,
  AlertTaskState,
  AlertInstanceSummary,
  AlertInstanceStatus,
  RawAlertInstance,
  AlertingFrameworkHealth,
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
  docLinks: DocLinksStart;
  http?: HttpSetup;
  readOnly: boolean;
  consumer?: string;
}

export interface ActionParamsProps<TParams> {
  actionParams: TParams;
  index: number;
  editAction: (property: string, value: any, index: number) => void;
  errors: IErrorObject;
  messageVariables?: ActionVariable[];
  defaultMessage?: string;
  docLinks: DocLinksStart;
  http: HttpSetup;
  toastNotifications: ToastsSetup;
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
}

export interface ActionVariables {
  context: ActionVariable[];
  state: ActionVariable[];
  params: ActionVariable[];
}

export interface AlertType {
  id: string;
  name: string;
  actionGroups: ActionGroup[];
  actionVariables: ActionVariables;
  defaultActionGroupId: ActionGroup['id'];
  authorizedConsumers: Record<string, { read: boolean; all: boolean }>;
  producer: string;
}

export type SanitizedAlertType = Omit<AlertType, 'apiKey'>;

export type AlertWithoutId = Omit<Alert, 'id'>;

export interface AlertTableItem extends Alert {
  alertType: AlertType['name'];
  tagsText: string;
  isEditable: boolean;
}

export interface AlertTypeParamsExpressionProps<
  AlertParamsType = unknown,
  AlertsContextValue = unknown
> {
  alertParams: AlertParamsType;
  alertInterval: string;
  alertThrottle: string;
  setAlertParams: (property: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
  errors: IErrorObject;
  alertsContext: AlertsContextValue;
}

export interface AlertTypeModel<AlertParamsType = any, AlertsContextValue = any> {
  id: string;
  name: string | JSX.Element;
  iconClass: string;
  validate: (alertParams: AlertParamsType) => ValidationResult;
  alertParamsExpression:
    | React.FunctionComponent<any>
    | React.LazyExoticComponent<
        ComponentType<AlertTypeParamsExpressionProps<AlertParamsType, AlertsContextValue>>
      >;
  requiresAppContext: boolean;
  defaultActionMessage?: string;
}

export interface IErrorObject {
  [key: string]: string | string[] | IErrorObject;
}
