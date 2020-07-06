/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-restricted-imports */
/* eslint-disable @kbn/eslint/no-restricted-paths */

import { ActionType } from '../../../../../triggers_actions_ui/public';
import { IErrorObject } from '../../../../../triggers_actions_ui/public/types';
import { ExternalIncidentServiceConfiguration } from '../../../../../actions/server/builtin_action_types/case/types';

import {
  ActionType as ThirdPartySupportedActions,
  CaseField,
} from '../../../../../case/common/api';

export { ThirdPartyField as AllThirdPartyFields } from '../../../../../case/common/api';

export interface ThirdPartyField {
  label: string;
  validSourceFields: CaseField[];
  defaultSourceField: CaseField;
  defaultActionType: ThirdPartySupportedActions;
}

export interface ConnectorConfiguration extends ActionType {
  logo: string;
  fields: Record<string, ThirdPartyField>;
}

export interface ActionConnector {
  config: ExternalIncidentServiceConfiguration;
  secrets: {};
}

export interface ActionConnectorParams {
  message: string;
}

export interface ActionConnectorValidationErrors {
  apiUrl: string[];
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;

export interface ConnectorFlyoutFormProps<T> {
  errors: IErrorObject;
  action: T;
  onChangeSecret: (key: string, value: string) => void;
  onBlurSecret: (key: string) => void;
  onChangeConfig: (key: string, value: string) => void;
  onBlurConfig: (key: string) => void;
}

export interface ConnectorFlyoutHOCProps<T> {
  ConnectorFormComponent: React.FC<ConnectorFlyoutFormProps<T>>;
  connectorActionTypeId: string;
  configKeys?: string[];
  secretKeys?: string[];
}
