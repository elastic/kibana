/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { TypeOf } from '@kbn/config-schema';
import { Logger } from '@kbn/logging';
import {
  ConfigMappingSchema,
  ExecutorParamsSchema,
  ExecutorSubActionCreateRecordParamsSchema,
  ExecutorSubActionGetApplicationParamsSchema,
  ExecutorSubActionPushParamsSchema,
  SwimlaneSecretsConfigurationSchema,
  SwimlaneServiceConfigurationSchema,
} from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';

export type SwimlanePublicConfigurationType = TypeOf<typeof SwimlaneServiceConfigurationSchema>;
export type SwimlaneSecretConfigurationType = TypeOf<typeof SwimlaneSecretsConfigurationSchema>;

export type MappingConfigType = TypeOf<typeof ConfigMappingSchema> &
  Record<string, FieldConfig | null>;

export type ExecutorParams = TypeOf<typeof ExecutorParamsSchema>;
export type ExecutorSubActionPushParams = TypeOf<typeof ExecutorSubActionPushParamsSchema>;

export type ExecutorSubActionCreateRecordParams = TypeOf<
  typeof ExecutorSubActionCreateRecordParamsSchema
>;

export interface ExternalServiceCredentials {
  config: SwimlanePublicConfigurationType;
  secrets: SwimlaneSecretConfigurationType;
}

export interface ExternalServiceValidation {
  config: (configurationUtilities: ActionsConfigurationUtilities, configObject: any) => void;
  secrets: (configurationUtilities: ActionsConfigurationUtilities, secrets: any) => void;
}

export interface CreateRecordParams {
  incident: Incident;
}
export interface UpdateRecordParams extends CreateRecordParams {
  incidentId: string;
}

export type PushToServiceApiParams = ExecutorSubActionPushParams;
export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
  logger: Logger;
}

export interface ExternalServiceIncidentResponse {
  id: string;
  title: string;
}

export interface FieldConfig {
  id: string;
  name: string;
  key: string;
  fieldType: string;
}

export interface SwimlaneRecordPayload {
  applicationId: string;
  values?: SwimlaneDataValues;
  comments?: SwimlaneDataComments;
}

export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  url: string;
}

// export type ExternalServiceParams = Record<string, unknown>;
export interface ExternalService {
  createRecord: (params: CreateRecordParams) => Promise<ExternalServiceIncidentResponse>;
  updateRecord: (params: UpdateRecordParams) => Promise<ExternalServiceIncidentResponse>;
}

export type Incident = ExecutorSubActionPushParams['incident'];
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

export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
  logger: Logger;
}

export interface GetApplicationHandlerArgs {
  externalService: ExternalService;
}

export interface ExternalServiceApi {
  createRecord: (args: CreateRecordApiHandlerArgs) => Promise<ExternalServiceIncidentResponse>;
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<ExternalServiceIncidentResponse>;
}

export type SwimlaneExecutorResultData = ExternalServiceIncidentResponse | PushToServiceResponse;
export type SwimlaneDataValues = Record<string, string | number>;
export type SwimlaneDataComments = Record<
  string,
  Array<{ fieldId: string; message: string | number; createdDate: string; isRichText: boolean }>
>;
