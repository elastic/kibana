/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This will have to remain `any` until we can extend connectors with generics
// and circular dependencies eliminated.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { TypeOf } from '@kbn/config-schema';

import {
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
  ExecutorParamsSchema,
  CaseConfigurationSchema,
  MapRecordSchema,
  CommentSchema,
  ExecutorSubActionPushParamsSchema,
  ExecutorSubActionGetIncidentParamsSchema,
  ExecutorSubActionHandshakeParamsSchema,
} from './schema';
import { LicenseType } from '../../../../../legacy/common/constants';

export interface AnyParams {
  [index: string]: string | number | object | undefined | null;
}

export type ExternalIncidentServiceConfiguration = TypeOf<
  typeof ExternalIncidentServiceConfigurationSchema
>;
export type ExternalIncidentServiceSecretConfiguration = TypeOf<
  typeof ExternalIncidentServiceSecretConfigurationSchema
>;

export type ExecutorParams = TypeOf<typeof ExecutorParamsSchema>;
export type ExecutorSubActionPushParams = TypeOf<typeof ExecutorSubActionPushParamsSchema>;

export type ExecutorSubActionGetIncidentParams = TypeOf<
  typeof ExecutorSubActionGetIncidentParamsSchema
>;

export type ExecutorSubActionHandshakeParams = TypeOf<
  typeof ExecutorSubActionHandshakeParamsSchema
>;

export type CaseConfiguration = TypeOf<typeof CaseConfigurationSchema>;
export type MapRecord = TypeOf<typeof MapRecordSchema>;
export type Comment = TypeOf<typeof CommentSchema>;

export interface ExternalServiceConfiguration {
  id: string;
  name: string;
  minimumLicenseRequired: LicenseType;
}

export interface ExternalServiceCredentials {
  config: Record<string, any>;
  secrets: Record<string, any>;
}

export interface ExternalServiceValidation {
  config: (configurationUtilities: any, configObject: any) => void;
  secrets: (configurationUtilities: any, secrets: any) => void;
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

export interface ExternalServiceParams {
  [index: string]: any;
}

export interface ExternalService {
  getIncident: (id: string) => Promise<any>;
  createIncident: (params: ExternalServiceParams) => Promise<ExternalServiceIncidentResponse>;
  updateIncident: (params: ExternalServiceParams) => Promise<ExternalServiceIncidentResponse>;
  createComment: (params: ExternalServiceParams) => Promise<ExternalServiceCommentResponse>;
}

export interface PushToServiceApiParams extends ExecutorSubActionPushParams {
  externalCase: Record<string, any>;
}

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
  mapping: Map<string, any>;
}

export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
}

export interface GetIncidentApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionGetIncidentParams;
}

export interface HandshakeApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionHandshakeParams;
}

export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}

export interface ExternalServiceApi {
  handshake: (args: HandshakeApiHandlerArgs) => Promise<void>;
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
  getIncident: (args: GetIncidentApiHandlerArgs) => Promise<void>;
}

export interface CreateExternalServiceBasicArgs {
  api: ExternalServiceApi;
  createExternalService: (credentials: ExternalServiceCredentials) => ExternalService;
}

export interface CreateExternalServiceArgs extends CreateExternalServiceBasicArgs {
  config: ExternalServiceConfiguration;
  validate: ExternalServiceValidation;
  validationSchema: { config: any; secrets: any };
}

export interface CreateActionTypeArgs {
  configurationUtilities: any;
  executor?: any;
}

export interface PipedField {
  key: string;
  value: string;
  actionType: string;
  pipes: string[];
}

export interface PrepareFieldsForTransformArgs {
  externalCase: Record<string, any>;
  mapping: Map<string, MapRecord>;
  defaultPipes?: string[];
}

export interface TransformFieldsArgs {
  params: PushToServiceApiParams;
  fields: PipedField[];
  currentIncident?: ExternalServiceParams;
}

export interface TransformerArgs {
  value: string;
  date?: string;
  user?: string;
  previousValue?: string;
}
