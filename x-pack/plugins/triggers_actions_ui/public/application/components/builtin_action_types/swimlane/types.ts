/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserConfiguredActionConnector } from '../../../../types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExecutorSubActionCreateRecordParams } from '../../../../../../actions/server/builtin_action_types/swimlane/types';

export type SwimlaneActionConnector = UserConfiguredActionConnector<
  SwimlaneConfig,
  SwimlaneSecrets
>;

export interface SwimlaneConfig {
  apiUrl: string;
  appId: string;
  mappings: SwimlaneMappingConfig;
}

export interface SwimlaneMappingConfig {
  alertSourceConfig: SwimlaneFieldMappingConfig;
  severityConfig: SwimlaneFieldMappingConfig;
  caseNameConfig: SwimlaneFieldMappingConfig;
  caseIdConfig: SwimlaneFieldMappingConfig;
  alertNameConfig: SwimlaneFieldMappingConfig;
  commentsConfig: SwimlaneFieldMappingConfig;
}

export interface SwimlaneFieldMappingConfig {
  id: string;
  key: string;
  name: string;
  fieldType: string;
}

export interface SwimlaneSecrets {
  apiToken: string;
}

export interface SwimlaneActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionCreateRecordParams;
}

export interface SwimlaneFieldMap {
  key: string;
  name: string;
}
