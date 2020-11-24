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
  ExecutorSubActionHandshakeParamsSchema,
  ExecutorSubActionPushParamsSchema,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
} from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { ExternalServiceCommentResponse } from '../case/types';
import { IncidentConfigurationSchema } from '../case/schema';
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

export type ServiceNowExecutorResultData = PushToServiceResponse | GetCommonFieldsResponse;

export interface CreateCommentRequest {
  [key: string]: string;
}

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
export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}

export type ExternalServiceParams = Record<string, unknown>;

export interface ExternalService {
  getFields: () => Promise<GetCommonFieldsResponse>;
  getIncident: (id: string) => Promise<ExternalServiceParams | undefined>;
  createIncident: (params: ExternalServiceParams) => Promise<ExternalServiceIncidentResponse>;
  updateIncident: (params: ExternalServiceParams) => Promise<ExternalServiceIncidentResponse>;
  findIncidents: (params?: Record<string, string>) => Promise<ExternalServiceParams[] | undefined>;
}

export type PushToServiceApiParams = ExecutorSubActionPushParams;

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
}

export type ExecutorSubActionGetIncidentParams = TypeOf<
  typeof ExecutorSubActionGetIncidentParamsSchema
>;

export type ExecutorSubActionHandshakeParams = TypeOf<
  typeof ExecutorSubActionHandshakeParamsSchema
>;

export type Incident = Pick<
  ExecutorSubActionPushParams['incident'],
  'description' | 'severity' | 'urgency' | 'impact'
> & {
  short_description: string;
};

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
export interface ExternalServiceFields {
  column_label: string;
  mandatory: string;
  max_length: string;
  element: string;
}
export type GetCommonFieldsResponse = ExternalServiceFields[];
export interface GetCommonFieldsHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionCommonFieldsParams;
}

export interface ExternalServiceApi {
  getFields: (args: GetCommonFieldsHandlerArgs) => Promise<GetCommonFieldsResponse>;
  handshake: (args: HandshakeApiHandlerArgs) => Promise<void>;
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
  getIncident: (args: GetIncidentApiHandlerArgs) => Promise<void>;
}
