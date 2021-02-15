/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserConfiguredActionConnector } from '../../../../types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExecutorSubActionPushParams } from '../../../../../../actions/server/builtin_action_types/servicenow/types';

export type ServiceNowActionConnector = UserConfiguredActionConnector<
  ServiceNowConfig,
  ServiceNowSecrets
>;

export interface ServiceNowActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionPushParams;
}

export interface ServiceNowConfig {
  apiUrl: string;
}

export interface ServiceNowSecrets {
  username: string;
  password: string;
}
