/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExecutorSubActionPushParamsITSM,
  ExecutorSubActionPushParamsSIR,
  ExecutorSubActionAddEventParams,
} from '@kbn/stack-connectors-plugin/server/connector_types/cases/servicenow/types';
import { UserConfiguredActionConnector } from '../../../../types';

export type ServiceNowActionConnector = UserConfiguredActionConnector<
  ServiceNowConfig,
  ServiceNowSecrets
>;

export interface ServiceNowITSMActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionPushParamsITSM;
}

export interface ServiceNowSIRActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionPushParamsSIR;
}

export interface ServiceNowITOMActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionAddEventParams;
}

// Config
export interface ServiceNowCommonConfig {
  isOAuth: boolean;
  apiUrl: string;
  usesTableApi: boolean;
}

export type ServiceNowBasicAuthConfig = ServiceNowCommonConfig;

export interface ServiceNowOAuthConfig {
  clientId?: string;
  userIdentifierValue?: string;
  jwtKeyId?: string;
}

export type ServiceNowConfig = ServiceNowBasicAuthConfig & ServiceNowOAuthConfig;

// Secrets
export interface ServiceNowBasicAuthSecrets {
  username?: string;
  password?: string;
}

export interface ServiceNowOAuthSecrets {
  clientSecret?: string;
  privateKey?: string;
  privateKeyPassword?: string;
}

export type ServiceNowSecrets = ServiceNowBasicAuthSecrets & ServiceNowOAuthSecrets;

export interface Choice {
  value: string;
  label: string;
  element: string;
  dependent_value: string;
}

export type Fields = Record<string, Choice[]>;
export interface AppInfo {
  id: string;
  name: string;
  scope: string;
  version: string;
}

export interface RESTApiError {
  error: {
    message: string;
    detail: string;
  };
  status: string;
}
