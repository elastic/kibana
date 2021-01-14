/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UserConfiguredActionConnector } from '../../../../types';
import {
  ExecutorSubActionPushParamsIM,
  ExecutorSubActionPushParamsSIR,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../actions/server/builtin_action_types/servicenow/types';

export type ServiceNowActionConnector = UserConfiguredActionConnector<
  ServiceNowConfig,
  ServiceNowSecrets
>;

export interface ServiceNowIMActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionPushParamsIM;
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
