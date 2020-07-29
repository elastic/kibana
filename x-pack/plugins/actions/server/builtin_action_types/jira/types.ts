/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { TypeOf } from '@kbn/config-schema';
import {
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
  ExecutorParamsSchema,
  ExecutorSubActionPushParamsSchema,
  ExecutorSubActionGetIncidentParamsSchema,
  ExecutorSubActionHandshakeParamsSchema,
  ExecutorSubActionCreateIssueMetadataParamsSchema,
  ExecutorSubActionGetCapabilitiesParamsSchema,
} from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { IncidentConfigurationSchema } from './case_schema';
import { PushToServiceResponse } from './case_types';
import { Logger } from '../../../../../../src/core/server';

export type JiraPublicConfigurationType = TypeOf<typeof ExternalIncidentServiceConfigurationSchema>;
export type JiraSecretConfigurationType = TypeOf<
  typeof ExternalIncidentServiceSecretConfigurationSchema
>;

export type ExecutorParams = TypeOf<typeof ExecutorParamsSchema>;
export type ExecutorSubActionPushParams = TypeOf<typeof ExecutorSubActionPushParamsSchema>;

export type IncidentConfiguration = TypeOf<typeof IncidentConfigurationSchema>;

export interface ExternalServiceCredentials {
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

export interface ExternalServiceValidation {
  config: (configurationUtilities: ActionsConfigurationUtilities, configObject: any) => void;
  secrets: (configurationUtilities: ActionsConfigurationUtilities, secrets: any) => void;
}

export interface ExternalServiceIncidentResponse {
  id: string;
  title: string;
  url: string;
  pushedDate: string;
}

export interface ExternalServiceCommentResponse {
  commentId: string;
  pushedDate: string;
  externalCommentId?: string;
}

export type ExternalServiceParams = Record<string, unknown>;

export interface ExternalService {
  getIncident: (id: string) => Promise<ExternalServiceParams | undefined>;
  findIncidents: (params?: Record<string, string>) => Promise<ExternalServiceParams[] | undefined>;
  createIncident: (params: ExternalServiceParams) => Promise<ExternalServiceIncidentResponse>;
  updateIncident: (params: ExternalServiceParams) => Promise<ExternalServiceIncidentResponse>;
  createComment: (params: ExternalServiceParams) => Promise<ExternalServiceCommentResponse>;
  getCreateIssueMetadata: () => Promise<ExternalServiceParams | undefined>;
  getCapabilities: () => Promise<ExternalServiceParams | undefined>;
}

export interface PushToServiceApiParams extends ExecutorSubActionPushParams {
  externalObject: Record<string, any>;
}

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
  mapping: Map<string, any> | null;
}

export type ExecutorSubActionGetIncidentParams = TypeOf<
  typeof ExecutorSubActionGetIncidentParamsSchema
>;

export type ExecutorSubActionHandshakeParams = TypeOf<
  typeof ExecutorSubActionHandshakeParamsSchema
>;

export type ExecutorSubActionCreateIssueMetadataParams = TypeOf<
  typeof ExecutorSubActionCreateIssueMetadataParamsSchema
>;

export type ExecutorSubActionGetCapabilitiesParams = TypeOf<
  typeof ExecutorSubActionGetCapabilitiesParamsSchema
>;

export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
  secrets: Record<string, unknown>;
  logger: Logger;
}

export interface GetIncidentApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionGetIncidentParams;
}

export interface HandshakeApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionHandshakeParams;
}

export interface CreateIssueMetadataHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionCreateIssueMetadataParams;
}

export interface GetCapabilitiesHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionGetCapabilitiesParams;
}

export interface ExternalServiceApi {
  handshake: (args: HandshakeApiHandlerArgs) => Promise<void>;
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
  getIncident: (args: GetIncidentApiHandlerArgs) => Promise<void>;
  getCreateIssueMetadata: (args: CreateIssueMetadataHandlerArgs) => Promise<void>;
  getCapabilities: (args: GetCapabilitiesHandlerArgs) => Promise<void>;
}
