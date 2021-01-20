/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { TypeOf } from '@kbn/config-schema';
import { Logger } from '@kbn/logging';
import {
  SwimlaneSecretsConfigurationSchema,
  SwimlaneServiceConfigurationSchema,
  ExecutorParamsSchema,
  ExecutorSubActionCreateRecordParamsSchema,
  ExecutorSubActionGetApplicationParamsSchema,
  ConfigMappingSchema,
} from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';

export type SwimlanePublicConfigurationType = TypeOf<typeof SwimlaneServiceConfigurationSchema>;
export type SwimlaneSecretConfigurationType = TypeOf<typeof SwimlaneSecretsConfigurationSchema>;

export type MappingConfigType = TypeOf<typeof ConfigMappingSchema> & Record<string, FieldConfig>;

export type ExecutorParams = TypeOf<typeof ExecutorParamsSchema>;
export type ExecutorSubActionCreateRecordParams = TypeOf<
  typeof ExecutorSubActionCreateRecordParamsSchema
>;

export interface ExternalServiceCredentials {
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

export interface ExternalServiceValidation {
  config: (configurationUtilities: ActionsConfigurationUtilities, configObject: any) => void;
  secrets: (configurationUtilities: ActionsConfigurationUtilities, secrets: any) => void;
}

export type CreateRecordParams = TypeOf<typeof ExecutorSubActionCreateRecordParamsSchema> &
  Record<string, unknown>;

export interface CreateRecordResponse {
  id: string;
}

export interface GetApplicationResponse {
  id: string;
  fields: FieldConfig[];
}

export interface FieldConfig {
  id: string;
  key: string;
}

export interface ExternalService {
  createRecord: (params: CreateRecordParams) => Promise<CreateRecordResponse>;
  application: () => Promise<GetApplicationResponse>;
}

export type CreateRecordApiParams = ExecutorSubActionCreateRecordParams;

export type ExecutorSubActionGetApplicationParams = TypeOf<
  typeof ExecutorSubActionGetApplicationParamsSchema
>;

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
}

export interface CreateRecordApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: CreateRecordApiParams;
  externalService: ExternalService;
  logger: Logger;
}

export interface GetApplicationHandlerArgs {
  externalService: ExternalService;
}

export interface ExternalServiceApi {
  application: (args: GetApplicationHandlerArgs) => Promise<GetApplicationResponse>;
  createRecord: (args: CreateRecordApiHandlerArgs) => Promise<CreateRecordResponse>;
}

export type SwimlaneExecutorResultData = CreateRecordResponse | GetApplicationResponse;

export interface SwimlaneRecordPayload {
  applicationId: string;
  values?: Record<string, unknown>;
}

//
// export interface SwimlaneConfig {
//   apiUrl: string;
//   appId: string;
//   mappings: SwimlaneMappingConfig;
// }
//
// export interface SwimlaneMappingConfig {
//   alertSourceKeyName: SwimlaneFieldMappingConfig;
//   severityKeyName: SwimlaneFieldMappingConfig;
//   caseNameKeyName: SwimlaneFieldMappingConfig;
//   caseIdKeyName: SwimlaneFieldMappingConfig;
//   alertNameKeyName: SwimlaneFieldMappingConfig;
//   commentsKeyName: SwimlaneFieldMappingConfig;
// }
//
// export interface SwimlaneFieldMappingConfig {
//   fieldKey: string;
//   fieldId: string;
// }
//
// export interface SwimlaneSecrets {
//   apiToken: string;
// }
//
// export interface SwimlanePushActionParams {
//   alertName: string;
//   caseId: string;
//   caseName: string;
//   alertSource: string;
//   comments: string;
//   severity: string;
// }
//
// export type SwimlaneActionType = ActionType<
//   SwimlanePublicConfigurationType,
//   SwimlaneSecretsConfigurationType,
//   ActionParamsType,
//   unknown
// >;
//
// export type SwimlaneActionTypeExecutorOptions = ActionTypeExecutorOptions<
//   SwimlanePublicConfigurationType,
//   SwimlaneSecretsConfigurationType,
//   ActionParamsType
// >;
//
// // config definition
//
// // params definition
//
// export type ActionParamsType = TypeOf<typeof ParamsSchema>;
//
//

//
// export interface ExternalServiceCredentials {
//   config: Record<string, unknown>;
//   secrets: Record<string, unknown>;
// }
//
// export interface ExternalServiceValidation {
//   config: (configurationUtilities: ActionsConfigurationUtilities, configObject: any) => void;
//   secrets: (configurationUtilities: ActionsConfigurationUtilities, secrets: any) => void;
// }
