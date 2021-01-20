/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  alertSourceKeyName: SwimlaneFieldMappingConfig;
  severityKeyName: SwimlaneFieldMappingConfig;
  caseNameKeyName: SwimlaneFieldMappingConfig;
  caseIdKeyName: SwimlaneFieldMappingConfig;
  alertNameKeyName: SwimlaneFieldMappingConfig;
  commentsKeyName: SwimlaneFieldMappingConfig;
}

export interface SwimlaneFieldMappingConfig {
  fieldKey: string;
  fieldId: string;
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
