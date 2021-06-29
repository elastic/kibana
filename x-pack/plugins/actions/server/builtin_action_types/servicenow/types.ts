/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { TypeOf } from '@kbn/config-schema';
import {
  ExecutorParamsSchemaITSM,
  ExecutorSubActionCommonFieldsParamsSchema,
  ExecutorSubActionGetIncidentParamsSchema,
  ExecutorSubActionHandshakeParamsSchema,
  ExecutorSubActionPushParamsSchemaITSM,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
  ExecutorParamsSchemaSIR,
  ExecutorSubActionPushParamsSchemaSIR,
  ExecutorSubActionGetChoicesParamsSchema,
} from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { Logger } from '../../../../../../src/core/server';

export type ServiceNowPublicConfigurationType = TypeOf<
  typeof ExternalIncidentServiceConfigurationSchema
>;
export type ServiceNowSecretConfigurationType = TypeOf<
  typeof ExternalIncidentServiceSecretConfigurationSchema
>;

export type ExecutorSubActionCommonFieldsParams = TypeOf<
  typeof ExecutorSubActionCommonFieldsParamsSchema
>;

export type ExecutorSubActionGetChoicesParams = TypeOf<
  typeof ExecutorSubActionGetChoicesParamsSchema
>;

export type ServiceNowExecutorResultData =
  | PushToServiceResponse
  | GetCommonFieldsResponse
  | GetChoicesResponse;

export interface CreateCommentRequest {
  [key: string]: string;
}

export type ExecutorParams =
  | TypeOf<typeof ExecutorParamsSchemaITSM>
  | TypeOf<typeof ExecutorParamsSchemaSIR>;

export type ExecutorSubActionPushParamsITSM = TypeOf<typeof ExecutorSubActionPushParamsSchemaITSM>;
export type ExecutorSubActionPushParamsSIR = TypeOf<typeof ExecutorSubActionPushParamsSchemaSIR>;

export type ExecutorSubActionPushParams =
  | ExecutorSubActionPushParamsITSM
  | ExecutorSubActionPushParamsSIR;

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
export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}

export type ExternalServiceParams = Record<string, unknown>;

export interface ExternalService {
  getChoices: (fields: string[]) => Promise<GetChoicesResponse>;
  getIncident: (id: string) => Promise<ExternalServiceParams | undefined>;
  getFields: () => Promise<GetCommonFieldsResponse>;
  createIncident: (params: ExternalServiceParams) => Promise<ExternalServiceIncidentResponse>;
  updateIncident: (params: ExternalServiceParams) => Promise<ExternalServiceIncidentResponse>;
  findIncidents: (params?: Record<string, string>) => Promise<ExternalServiceParams[] | undefined>;
}

export type PushToServiceApiParams = ExecutorSubActionPushParams;
export type PushToServiceApiParamsITSM = ExecutorSubActionPushParamsITSM;
export type PushToServiceApiParamsSIR = ExecutorSubActionPushParamsSIR;

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
}

export type ExecutorSubActionGetIncidentParams = TypeOf<
  typeof ExecutorSubActionGetIncidentParamsSchema
>;

export type ExecutorSubActionHandshakeParams = TypeOf<
  typeof ExecutorSubActionHandshakeParamsSchema
>;

export type ServiceNowITSMIncident = Omit<
  TypeOf<typeof ExecutorSubActionPushParamsSchemaITSM>['incident'],
  'externalId'
>;

export type ServiceNowSIRIncident = Omit<
  TypeOf<typeof ExecutorSubActionPushParamsSchemaSIR>['incident'],
  'externalId'
>;

export type Incident = ServiceNowITSMIncident | ServiceNowSIRIncident;

export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
  secrets: Record<string, unknown>;
  logger: Logger;
  commentFieldKey: string;
}

export interface GetIncidentApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionGetIncidentParams;
}

export interface HandshakeApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionHandshakeParams;
}
export interface ExternalServiceFields {
  column_label: string;
  mandatory: string;
  max_length: string;
  element: string;
}

export interface ExternalServiceChoices {
  value: string;
  label: string;
  dependent_value: string;
  element: string;
}

export type GetCommonFieldsResponse = ExternalServiceFields[];
export type GetChoicesResponse = ExternalServiceChoices[];

export interface GetCommonFieldsHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionCommonFieldsParams;
}

export interface GetChoicesHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionGetChoicesParams;
}

export interface ExternalServiceApi {
  getChoices: (args: GetChoicesHandlerArgs) => Promise<GetChoicesResponse>;
  getFields: (args: GetCommonFieldsHandlerArgs) => Promise<GetCommonFieldsResponse>;
  handshake: (args: HandshakeApiHandlerArgs) => Promise<void>;
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
  getIncident: (args: GetIncidentApiHandlerArgs) => Promise<void>;
}

export interface ExternalServiceCommentResponse {
  commentId: string;
  pushedDate: string;
  externalCommentId?: string;
}

type TypeNullOrUndefined<T> = T | null | undefined;
export interface ResponseError {
  error: TypeNullOrUndefined<{
    message: TypeNullOrUndefined<string>;
    detail: TypeNullOrUndefined<string>;
  }>;
  status: TypeNullOrUndefined<string>;
}
