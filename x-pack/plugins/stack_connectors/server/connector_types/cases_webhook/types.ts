/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';
import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import {
  ExecutorParamsSchema,
  ExecutorSubActionPushParamsSchema,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
} from './schema';

// config definition
export enum CasesWebhookMethods {
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
  config: CasesWebhookPublicConfigurationType;
  secrets: CasesWebhookSecretConfigurationType;
}

export interface ExternalServiceValidation {
  config: (
    configObject: CasesWebhookPublicConfigurationType,
    validatorServices: ValidatorServices
  ) => void;
  secrets: (
    secrets: CasesWebhookSecretConfigurationType,
    validatorServices: ValidatorServices
  ) => void;
  connector: (
    configObject: CasesWebhookPublicConfigurationType,
    secrets: CasesWebhookSecretConfigurationType
  ) => string | null;
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
  createComment: (params: CreateCommentParams) => Promise<unknown>;
  createIncident: (params: CreateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
  getIncident: (id: string) => Promise<GetIncidentResponse>;
  updateIncident: (params: UpdateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
}
export interface CreateIncidentParams {
  incident: Incident;
}
export interface UpdateIncidentParams {
  incidentId: string;
  incident: Incident;
}
export interface SimpleComment {
  comment: string;
  commentId: string;
}

export interface CreateCommentParams {
  incidentId: string;
  comment: SimpleComment;
}

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
}

// incident api
export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
  logger: Logger;
}
export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}

export interface ExternalServiceCommentResponse {
  commentId: string;
  pushedDate: string;
  externalCommentId?: string;
}

export interface GetIncidentResponse {
  id: string;
  title: string;
}

export interface ExternalServiceApi {
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
}

export type CasesWebhookExecutorResultData = ExternalServiceIncidentResponse;
