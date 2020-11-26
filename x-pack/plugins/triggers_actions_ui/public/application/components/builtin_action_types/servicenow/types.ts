/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CasesConfigurationMapping } from '../case_mappings';
import { UserConfiguredActionConnector } from '../../../../types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExecutorSubActionPushParams } from '../../../../../../actions/server/builtin_action_types/servicenow/types';

export type ServiceNowActionConnector = UserConfiguredActionConnector<
  ServiceNowConfig,
  ServiceNowSecrets
>;

export interface ServiceNowActionParams {
  subAction: 'pushToService';
  subActionParams: ExecutorSubActionPushParams;
}

interface IncidentConfiguration {
  mapping: CasesConfigurationMapping[];
}

export interface ServiceNowConfig {
  apiUrl: string;
  incidentConfiguration?: IncidentConfiguration;
  isCaseOwned?: boolean;
}

export interface ServiceNowSecrets {
  username: string;
  password: string;
}
