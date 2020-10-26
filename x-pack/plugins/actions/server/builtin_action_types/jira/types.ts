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
  ExecutorSubActionGetCapabilitiesParamsSchema,
  ExecutorSubActionGetIssueTypesParamsSchema,
  ExecutorSubActionGetFieldsByIssueTypeParamsSchema,
  ExecutorSubActionGetIssuesParamsSchema,
  ExecutorSubActionGetIssueParamsSchema,
} from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { IncidentConfigurationSchema } from '../case/schema';
import { Comment } from '../case/types';
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

export type Incident = Pick<
  ExecutorSubActionPushParams,
  'description' | 'priority' | 'labels' | 'issueType' | 'parent'
> & { summary: string };

export interface CreateIncidentParams {
  incident: Incident;
}

export interface UpdateIncidentParams {
  incidentId: string;
  incident: Incident;
}

export interface CreateCommentParams {
  incidentId: string;
  comment: Comment;
}

export type GetIssueTypesResponse = Array<{ id: string; name: string }>;
export type GetFieldsByIssueTypeResponse = Record<
  string,
  { allowedValues: Array<{}>; defaultValue: {} }
>;

export type GetIssuesResponse = Array<{ id: string; key: string; title: string }>;
export interface GetIssueResponse {
  id: string;
  key: string;
  title: string;
}

export interface ExternalService {
  getIncident: (id: string) => Promise<ExternalServiceParams | undefined>;
  createIncident: (params: CreateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
  updateIncident: (params: UpdateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
  createComment: (params: CreateCommentParams) => Promise<ExternalServiceCommentResponse>;
  getCapabilities: () => Promise<ExternalServiceParams>;
  getIssueTypes: () => Promise<GetIssueTypesResponse>;
  getFieldsByIssueType: (issueTypeId: string) => Promise<GetFieldsByIssueTypeResponse>;
  getIssues: (title: string) => Promise<GetIssuesResponse>;
  getIssue: (id: string) => Promise<GetIssueResponse>;
}

export interface PushToServiceApiParams extends ExecutorSubActionPushParams {
  externalObject: Record<string, any>;
}

export type ExecutorSubActionGetIncidentParams = TypeOf<
  typeof ExecutorSubActionGetIncidentParamsSchema
>;

export type ExecutorSubActionHandshakeParams = TypeOf<
  typeof ExecutorSubActionHandshakeParamsSchema
>;

export type ExecutorSubActionGetCapabilitiesParams = TypeOf<
  typeof ExecutorSubActionGetCapabilitiesParamsSchema
>;

export type ExecutorSubActionGetIssueTypesParams = TypeOf<
  typeof ExecutorSubActionGetIssueTypesParamsSchema
>;

export type ExecutorSubActionGetFieldsByIssueTypeParams = TypeOf<
  typeof ExecutorSubActionGetFieldsByIssueTypeParamsSchema
>;

export type ExecutorSubActionGetIssuesParams = TypeOf<
  typeof ExecutorSubActionGetIssuesParamsSchema
>;

export type ExecutorSubActionGetIssueParams = TypeOf<typeof ExecutorSubActionGetIssueParamsSchema>;

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
  mapping: Map<string, any> | null;
}

export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
  logger: Logger;
}

export interface GetIncidentApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionGetIncidentParams;
}

export interface HandshakeApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionHandshakeParams;
}

export interface GetIssueTypesHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionGetIssueTypesParams;
}

export interface GetFieldsByIssueTypeHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionGetFieldsByIssueTypeParams;
}

export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}

export interface GetIssuesHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionGetIssuesParams;
}

export interface GetIssueHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionGetIssueParams;
}

export interface ExternalServiceApi {
  handshake: (args: HandshakeApiHandlerArgs) => Promise<void>;
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
  getIncident: (args: GetIncidentApiHandlerArgs) => Promise<void>;
  issueTypes: (args: GetIssueTypesHandlerArgs) => Promise<GetIssueTypesResponse>;
  fieldsByIssueType: (
    args: GetFieldsByIssueTypeHandlerArgs
  ) => Promise<GetFieldsByIssueTypeResponse>;
  issues: (args: GetIssuesHandlerArgs) => Promise<GetIssuesResponse>;
  issue: (args: GetIssueHandlerArgs) => Promise<GetIssueResponse>;
}

export type JiraExecutorResultData =
  | PushToServiceResponse
  | GetIssueTypesResponse
  | GetFieldsByIssueTypeResponse
  | GetIssuesResponse
  | GetIssueResponse;

export interface Fields {
  [key: string]: string | string[] | { name: string } | { key: string } | { id: string };
}
export interface ResponseError {
  errorMessages: string[] | null | undefined;
  errors: { [k: string]: string } | null | undefined;
}
