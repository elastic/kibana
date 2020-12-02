/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { TypeOf } from '@kbn/config-schema';
import {
  ExecutorParamsSchema,
  ExecutorSubActionCommonFieldsParamsSchema,
  ExecutorSubActionGetIncidentParamsSchema,
  ExecutorSubActionGetIncidentTypesParamsSchema,
  ExecutorSubActionGetSeverityParamsSchema,
  ExecutorSubActionHandshakeParamsSchema,
  ExecutorSubActionPushParamsSchema,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
} from './schema';

import { ActionsConfigurationUtilities } from '../../actions_config';
import { Logger } from '../../../../../../src/core/server';

import { IncidentConfigurationSchema } from '../case/schema';
import { Comment } from '../case/types';

export type ResilientPublicConfigurationType = TypeOf<
  typeof ExternalIncidentServiceConfigurationSchema
>;
export type ResilientSecretConfigurationType = TypeOf<
  typeof ExternalIncidentServiceSecretConfigurationSchema
>;

export type ExecutorSubActionCommonFieldsParams = TypeOf<
  typeof ExecutorSubActionCommonFieldsParamsSchema
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
export interface ExternalServiceFields {
  id: string;
  input_type: string;
  name: string;
  read_only: boolean;
  required?: string;
}
export type GetCommonFieldsResponse = ExternalServiceFields[];

export type Incident = Pick<
  ExecutorSubActionPushParams,
  'description' | 'incidentTypes' | 'severityCode'
> & {
  name: string;
};

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

export type GetIncidentTypesResponse = Array<{ id: string; name: string }>;
export type GetSeverityResponse = Array<{ id: string; name: string }>;

export interface ExternalService {
  createComment: (params: CreateCommentParams) => Promise<ExternalServiceCommentResponse>;
  createIncident: (params: CreateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
  getFields: () => Promise<GetCommonFieldsResponse>;
  getIncident: (id: string) => Promise<ExternalServiceParams | undefined>;
  getIncidentTypes: () => Promise<GetIncidentTypesResponse>;
  getSeverity: () => Promise<GetSeverityResponse>;
  updateIncident: (params: UpdateIncidentParams) => Promise<ExternalServiceIncidentResponse>;
}

export interface PushToServiceApiParams extends ExecutorSubActionPushParams {
  externalObject: Record<string, any>;
}

export type ExecutorSubActionGetIncidentTypesParams = TypeOf<
  typeof ExecutorSubActionGetIncidentTypesParamsSchema
>;

export type ExecutorSubActionGetSeverityParams = TypeOf<
  typeof ExecutorSubActionGetSeverityParamsSchema
>;

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

export interface GetCommonFieldsHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionCommonFieldsParams;
}

export interface GetIncidentTypesHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionGetIncidentTypesParams;
}

export interface GetSeverityHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionGetSeverityParams;
}

export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}

export interface ExternalServiceApi {
  getFields: (args: GetCommonFieldsHandlerArgs) => Promise<GetCommonFieldsResponse>;
  handshake: (args: HandshakeApiHandlerArgs) => Promise<void>;
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
  getIncident: (args: GetIncidentApiHandlerArgs) => Promise<void>;
  incidentTypes: (args: GetIncidentTypesHandlerArgs) => Promise<GetIncidentTypesResponse>;
  severity: (args: GetSeverityHandlerArgs) => Promise<GetSeverityResponse>;
}

export type ResilientExecutorResultData =
  | PushToServiceResponse
  | GetCommonFieldsResponse
  | GetIncidentTypesResponse
  | GetSeverityResponse;

export interface UpdateFieldText {
  text: string;
}
export interface UpdateFieldText {
  text: string;
}

export interface UpdateIdsField {
  ids: number[];
}

export interface UpdateIdField {
  id: number;
}

export interface UpdateFieldTextArea {
  textarea: { format: 'html' | 'text'; content: string };
}

interface UpdateField {
  field: { name: string };
  old_value: UpdateFieldText | UpdateFieldTextArea | UpdateIdsField | UpdateIdField;
  new_value: UpdateFieldText | UpdateFieldTextArea | UpdateIdsField | UpdateIdField;
}

export interface UpdateIncidentRequest {
  changes: UpdateField[];
}

export type GetValueTextContentResponse =
  | UpdateFieldText
  | UpdateFieldTextArea
  | UpdateIdsField
  | UpdateIdField;

export interface CreateIncidentData {
  name: string;
  discovered_date: number;
  description?: { format: string; content: string };
  incident_type_ids?: Array<{ id: number }>;
  severity_code?: { id: number };
}
