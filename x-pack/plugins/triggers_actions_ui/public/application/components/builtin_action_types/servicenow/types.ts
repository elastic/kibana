/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ExecutorSubActionPushParamsITSM,
  ExecutorSubActionPushParamsSIR,
} from '../../../../../../actions/server/builtin_action_types/servicenow/types';
import type { UserConfiguredActionConnector } from '../../../../types';

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

export interface ServiceNowConfig {
  apiUrl: string;
}

export interface ServiceNowSecrets {
  username: string;
  password: string;
}

export interface Choice {
  value: string;
  label: string;
  element: string;
  dependent_value: string;
}

export type Fields = Record<string, Choice[]>;
