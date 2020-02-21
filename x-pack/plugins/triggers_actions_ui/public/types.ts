/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ActionType } from '../../actions/common';
import { TypeRegistry } from './application/type_registry';
import {
  SanitizedAlert as Alert,
  AlertAction,
  AlertTaskState,
  RawAlertInstance,
} from '../../../plugins/alerting/common';
export { Alert, AlertAction, AlertTaskState, RawAlertInstance };
export { ActionType };

export type ActionTypeIndex = Record<string, ActionType>;
export type AlertTypeIndex = Record<string, AlertType>;
export type ActionTypeRegistryContract = PublicMethodsOf<TypeRegistry<ActionTypeModel>>;
export type AlertTypeRegistryContract = PublicMethodsOf<TypeRegistry<AlertTypeModel>>;

export interface ActionConnectorFieldsProps<TActionCOnnector> {
  action: TActionCOnnector;
  editActionConfig: (property: string, value: any) => void;
  editActionSecrets: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
}

export interface ActionParamsProps<TParams> {
  actionParams: TParams;
  index: number;
  editAction: (property: string, value: any, index: number) => void;
  errors: { [key: string]: string[] };
  messageVariables?: string[];
  defaultMessage?: string;
}

export interface Pagination {
  index: number;
  size: number;
}

export interface ActionTypeModel {
  id: string;
  iconClass: string;
  selectMessage: string;
  actionTypeTitle?: string;
  validateConnector: (connector: any) => ValidationResult;
  validateParams: (actionParams: any) => ValidationResult;
  actionConnectorFields: React.FunctionComponent<any> | null;
  actionParamsFields: any;
}

export interface ValidationResult {
  errors: Record<string, any>;
}

export interface ActionConnector {
  secrets: Record<string, any>;
  id: string;
  actionTypeId: string;
  name: string;
  referencedByCount?: number;
  config: Record<string, any>;
}

export type ActionConnectorWithoutId = Omit<ActionConnector, 'id'>;

export interface ActionConnectorTableItem extends ActionConnector {
  actionType: ActionType['name'];
}

export interface ActionGroup {
  id: string;
  name: string;
}
export interface AlertType {
  id: string;
  name: string;
  actionGroups: ActionGroup[];
  actionVariables: string[];
}

export type AlertWithoutId = Omit<Alert, 'id'>;

export interface AlertTableItem extends Alert {
  alertType: AlertType['name'];
  tagsText: string;
}

export interface AlertTypeModel {
  id: string;
  name: string;
  iconClass: string;
  validate: (alertParams: any) => ValidationResult;
  alertParamsExpression: React.FunctionComponent<any>;
  defaultActionMessage?: string;
}

export interface IErrorObject {
  [key: string]: string[];
}
