/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
import { ActionsConfigurationUtilities } from '../../actions_config';
import { ExecutorType } from '../../types';

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
  // This will have to remain `any` until we can extend connectors with generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  externalCase: Record<string, any>;
}

export interface ConnectorConfiguration {
  id: string;
  name: string;
}

export interface ExternalServiceCredential {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secrets: Record<string, any>;
}

export interface ConnectorValidation {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: (configurationUtilities: ActionsConfigurationUtilities, configObject: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secrets: (configurationUtilities: ActionsConfigurationUtilities, secrets: any) => void;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [index: string]: any;
}

export interface ExternalService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getIncident: (id: string) => Promise<any>;
  createIncident: (params: ExternalServiceParams) => Promise<ExternalServiceCaseResponse>;
  updateIncident: (params: ExternalServiceParams) => Promise<ExternalServiceCaseResponse>;
  createComment: (params: ExternalServiceParams) => Promise<ExternalServiceCommentResponse>;
}

export interface ConnectorApiHandlerArgs {
  externalService: ExternalService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validationSchema: { config: any; secrets: any };
}

export interface CreateActionTypeArgs {
  configurationUtilities: ActionsConfigurationUtilities;
  executor?: ExecutorType;
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
