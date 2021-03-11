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

export type MappingConfigType = TypeOf<typeof ConfigMappingSchema> &
  Record<string, FieldConfig | null>;

export type ExecutorParams = TypeOf<typeof ExecutorParamsSchema>;

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

export type CreateRecordParams = TypeOf<typeof ExecutorSubActionCreateRecordParamsSchema> &
  Record<string, string | number | null>;

export interface CreateRecordResponse {
  id: string;
}

export interface FieldConfig {
  id: string;
  name: string;
  key: string;
  fieldType: string;
}

export interface ExternalService {
  createRecord: (params: CreateRecordParams) => Promise<CreateRecordResponse>;
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
  createRecord: (args: CreateRecordApiHandlerArgs) => Promise<CreateRecordResponse>;
}

export type SwimlaneExecutorResultData = CreateRecordResponse;

export interface SwimlaneRecordPayload {
  applicationId: string;
  values?: Record<string, string | number>;
}
