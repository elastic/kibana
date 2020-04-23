/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType } from '../../../../../../plugins/triggers_actions_ui/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ConnectorPublicConfigurationType } from '../../../../../../plugins/actions/common';

import {
  ConfigType,
  SecretsType,
} from '../../../../actions/server/builtin_action_types/servicenow/types';

export interface ServiceNowActionConnector {
  config: ConfigType;
  secrets: SecretsType;
}

export interface Connector extends ActionType {
  logo: string;
}

export interface ActionConnector {
  config: ConnectorPublicConfigurationType;
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
  errors: { [key: string]: string[] };
  action: T;
  onChangeSecret: (key: string, value: string) => void;
  onBlurSecret: (key: string) => void;
  onChangeConfig: (key: string, value: string) => void;
  onBlurConfig: (key: string) => void;
}

export interface ConnectorFlyoutHOCProps<T> {
  ConnectorFormComponent: React.FC<ConnectorFlyoutFormProps<T>>;
  configKeys?: string[];
  secretKeys?: string[];
}
