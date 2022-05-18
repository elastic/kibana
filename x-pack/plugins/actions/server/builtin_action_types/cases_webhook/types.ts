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

export interface ExternalServiceCredentials {
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

export interface ExternalServiceValidation {
  config: (configurationUtilities: ActionsConfigurationUtilities, configObject: any) => void;
  secrets: (configurationUtilities: ActionsConfigurationUtilities, secrets: any) => void;
}

export interface CreateIncidentParams {
  incident: Incident;
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
export interface ExternalService {
  createIncident: (params: CreateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
}

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
}
export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
  logger: Logger;
}
export type PushToServiceResponse = ExternalServiceIncidentResponse;

export interface ExternalServiceApi {
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
}

export type CasesWebhookExecutorResultData = ExternalServiceIncidentResponse;

export interface ResponseError {
  errorMessages: string[] | null | undefined;
  errors: { [k: string]: string } | null | undefined;
}

export type CasesWebhookPublicConfigurationType = TypeOf<
  typeof ExternalIncidentServiceConfigurationSchema
>;
export type CasesWebhookSecretConfigurationType = TypeOf<
  typeof ExternalIncidentServiceSecretConfigurationSchema
>;
