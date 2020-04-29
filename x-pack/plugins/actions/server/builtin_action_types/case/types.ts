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
  ConnectorPublicConfigurationSchema,
  ConnectorSecretConfigurationSchema,
  ExecutorParamsSchema,
  CaseConfigurationSchema,
  MapRecordSchema,
  CommentSchema,
  ExecutorActionParamsSchema,
} from './schema';

export interface AnyParams {
  [index: string]: string | number | object | null | undefined;
}

export type ConnectorPublicConfigurationType = TypeOf<typeof ConnectorPublicConfigurationSchema>;
export type ConnectorSecretConfigurationType = TypeOf<typeof ConnectorSecretConfigurationSchema>;

export type ExecutorParams = TypeOf<typeof ExecutorParamsSchema>;
export type ExecutorActionParams = TypeOf<typeof ExecutorActionParamsSchema> & AnyParams;

export type CaseConfiguration = TypeOf<typeof CaseConfigurationSchema>;
export type MapRecord = TypeOf<typeof MapRecordSchema>;
export type Comment = TypeOf<typeof CommentSchema>;

export interface ApiParams extends ExecutorActionParams {
  externalCase: Record<string, any>;
}

export interface ConnectorConfiguration {
  id: string;
  name: string;
}

export interface ExternalServiceCredential {
  config: Record<string, any>;
  secrets: Record<string, any>;
}

export interface ConnectorValidation {
  config: (configurationUtilities: any, configObject: any) => void;
  secrets: (configurationUtilities: any, secrets: any) => void;
}

export interface ExternalServiceCaseResponse {
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
  createIncident: (params: ExternalServiceParams) => Promise<ExternalServiceCaseResponse>;
  updateIncident: (params: ExternalServiceParams) => Promise<ExternalServiceCaseResponse>;
  createComment: (params: ExternalServiceParams) => Promise<ExternalServiceCommentResponse>;
}

export interface ConnectorApiHandlerArgs {
  externalService: ExternalService;
  mapping: Map<string, any>;
  params: ApiParams;
}

export interface PushToServiceResponse extends ExternalServiceCaseResponse {
  comments?: ExternalServiceCommentResponse[];
}

export interface ConnectorApi {
  handshake: (args: ConnectorApiHandlerArgs) => Promise<void>;
  pushToService: (args: ConnectorApiHandlerArgs) => Promise<PushToServiceResponse>;
  getIncident: (args: ConnectorApiHandlerArgs) => Promise<void>;
}

export interface CreateConnectorBasicArgs {
  api: ConnectorApi;
  createExternalService: (credentials: ExternalServiceCredential) => ExternalService;
}

export interface CreateConnectorArgs extends CreateConnectorBasicArgs {
  config: ConnectorConfiguration;
  validate: ConnectorValidation;
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
  params: ApiParams;
  mapping: Map<string, MapRecord>;
  defaultPipes?: string[];
}

export interface TransformFieldsArgs {
  params: ExecutorActionParams;
  fields: PipedField[];
  currentIncident?: ExternalServiceParams;
}

export interface TransformerArgs {
  value: string;
  date?: string;
  user?: string;
  previousValue?: string;
}
