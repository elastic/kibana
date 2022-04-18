/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { TypeOf } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';
import {
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
  ExecutorParamsSchema,
  ExecutorSubActionPushParamsSchema,
  ExecutorSubActionGetIncidentParamsSchema,
  ExecutorSubActionHandshakeParamsSchema,
  ExecutorSubActionGetCapabilitiesParamsSchema,
  ExecutorSubActionGetFieldsByIssueTypeParamsSchema,
  ExecutorSubActionGetIssuesParamsSchema,
  ExecutorSubActionGetIssueParamsSchema,
  ExecutorSubActionCommonFieldsParamsSchema,
} from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';

export type JiraPublicConfigurationType = TypeOf<typeof ExternalIncidentServiceConfigurationSchema>;
export type JiraSecretConfigurationType = TypeOf<
  typeof ExternalIncidentServiceSecretConfigurationSchema
>;

export type ExecutorParams = TypeOf<typeof ExecutorParamsSchema>;
export type ExecutorSubActionPushParams = TypeOf<typeof ExecutorSubActionPushParamsSchema>;

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

export type ExternalServiceParams = Record<string, unknown>;

export type Incident = Omit<ExecutorSubActionPushParams['incident'], 'externalId'>;

export interface CreateIncidentParams {
  incident: Incident;
}

export interface UpdateIncidentParams {
  incidentId: string;
  incident: Incident;
}

export interface CreateCommentParams {
  incidentId: string;
  comment: SimpleComment;
}

export interface FieldsSchema {
  type: string;
  [key: string]: string;
}

export type GetIssueTypesResponse = Array<{ id: string; name: string }>;

export interface FieldSchema {
  type: string;
  items?: string;
}
export type GetFieldsByIssueTypeResponse = Record<
  string,
  {
    allowedValues: Array<{}>;
    defaultValue: {};
    required: boolean;
    schema: FieldSchema;
    name: string;
  }
>;
export type GetCommonFieldsResponse = GetFieldsByIssueTypeResponse;

export type GetIssuesResponse = Array<{ id: string; key: string; title: string }>;
export interface GetIssueResponse {
  id: string;
  key: string;
  title: string;
}

export interface ExternalService {
  createComment: (params: CreateCommentParams) => Promise<ExternalServiceCommentResponse>;
  createIncident: (params: CreateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
  getFields: () => Promise<GetCommonFieldsResponse>;
  getCapabilities: () => Promise<ExternalServiceParams>;
  getFieldsByIssueType: (issueTypeId: string) => Promise<GetFieldsByIssueTypeResponse>;
  getIncident: (id: string) => Promise<ExternalServiceParams | undefined>;
  getIssue: (id: string) => Promise<GetIssueResponse>;
  getIssues: (title: string) => Promise<GetIssuesResponse>;
  getIssueTypes: () => Promise<GetIssueTypesResponse>;
  updateIncident: (params: UpdateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
}

export type PushToServiceApiParams = ExecutorSubActionPushParams;

export type ExecutorSubActionGetIncidentParams = TypeOf<
  typeof ExecutorSubActionGetIncidentParamsSchema
>;

export type ExecutorSubActionHandshakeParams = TypeOf<
  typeof ExecutorSubActionHandshakeParamsSchema
>;

export type ExecutorSubActionGetCapabilitiesParams = TypeOf<
  typeof ExecutorSubActionGetCapabilitiesParamsSchema
>;

export type ExecutorSubActionCommonFieldsParams = TypeOf<
  typeof ExecutorSubActionCommonFieldsParamsSchema
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
  params: ExecutorSubActionCommonFieldsParams;
}

export interface GetCommonFieldsHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionCommonFieldsParams;
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
  getFields: (args: GetCommonFieldsHandlerArgs) => Promise<GetCommonFieldsResponse>;
  getIncident: (args: GetIncidentApiHandlerArgs) => Promise<ExternalServiceParams | undefined>;
  handshake: (args: HandshakeApiHandlerArgs) => Promise<void>;
  issueTypes: (args: GetIssueTypesHandlerArgs) => Promise<GetIssueTypesResponse>;
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
  fieldsByIssueType: (
    args: GetFieldsByIssueTypeHandlerArgs
  ) => Promise<GetFieldsByIssueTypeResponse>;
  issue: (args: GetIssueHandlerArgs) => Promise<GetIssueResponse>;
  issues: (args: GetIssuesHandlerArgs) => Promise<GetIssuesResponse>;
}

export type JiraExecutorResultData =
  | PushToServiceResponse
  | GetIssueTypesResponse
  | GetFieldsByIssueTypeResponse
  | GetIssuesResponse
  | GetIssueResponse
  | ExternalServiceParams;

export interface Fields {
  [key: string]: string | string[] | { name: string } | { key: string } | { id: string };
}
export interface ResponseError {
  errorMessages: string[] | null | undefined;
  errors: { [k: string]: string } | null | undefined;
}
export interface SimpleComment {
  comment: string;
  commentId: string;
}
export interface ExternalServiceCommentResponse {
  commentId: string;
  pushedDate: string;
  externalCommentId?: string;
}
