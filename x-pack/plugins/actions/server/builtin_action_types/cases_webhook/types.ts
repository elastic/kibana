/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';
import { ActionsConfigurationUtilities } from '../../actions_config';
import {
  ExecutorParamsSchema,
  ExecutorSubActionPushParamsSchema,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
} from './schema';

// config definition
export const enum CasesWebhookMethods {
  PATCH = 'patch',
  POST = 'post',
  PUT = 'put',
}

// config
export type CasesWebhookPublicConfigurationType = TypeOf<
  typeof ExternalIncidentServiceConfigurationSchema
>;
// secrets
export type CasesWebhookSecretConfigurationType = TypeOf<
  typeof ExternalIncidentServiceSecretConfigurationSchema
>;
// params
export type CasesWebhookActionParamsType = TypeOf<typeof ExecutorParamsSchema>;

export interface ExternalServiceCredentials {
  config: Record<keyof CasesWebhookPublicConfigurationType, unknown>;
  secrets: Record<string, unknown>;
}

export interface ExternalServiceValidation {
  config: (
    configurationUtilities: ActionsConfigurationUtilities,
    configObject: CasesWebhookPublicConfigurationType
  ) => void;
  secrets: (secrets: CasesWebhookSecretConfigurationType) => void;
}

export interface ExternalServiceIncidentResponse {
  id: string;
  title: string;
  url: string;
  pushedDate: string;
}
export type Incident = Omit<ExecutorSubActionPushParams['incident'], 'externalId'>;

export type ExecutorParams = TypeOf<typeof ExecutorParamsSchema>;
export type ExecutorSubActionPushParams = TypeOf<typeof ExecutorSubActionPushParamsSchema>;
export type PushToServiceApiParams = ExecutorSubActionPushParams;

// incident service
export interface ExternalService {
  getIncident: (id: string) => Promise<GetIncidentResponse>;
  createIncident: (params: CreateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
}
export interface CreateIncidentParams {
  incident: Incident;
}

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
}

// incident api
export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
  logger: Logger;
}
export type PushToServiceResponse = ExternalServiceIncidentResponse;

export interface GetIncidentResponse {
  id: string;
  title: string;
  created: string;
  updated: string;
}

export interface ExternalServiceApi {
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
}

export type CasesWebhookExecutorResultData = ExternalServiceIncidentResponse;

export interface ResponseError {
  errorMessages: string[] | null | undefined;
  errors: { [k: string]: string } | null | undefined;
}
