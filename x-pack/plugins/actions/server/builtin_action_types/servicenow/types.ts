/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { AxiosError, AxiosResponse } from 'axios';
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
  ExecutorParamsSchemaITOM,
  ExecutorSubActionAddEventParamsSchema,
  ExternalIncidentServiceConfigurationBaseSchema,
} from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { Logger } from '../../../../../../src/core/server';

export type ServiceNowPublicConfigurationBaseType = TypeOf<
  typeof ExternalIncidentServiceConfigurationBaseSchema
>;

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

export type Incident = ServiceNowITSMIncident | ServiceNowSIRIncident;
export type PartialIncident = Partial<Incident>;

export interface ExternalServiceParamsCreate {
  incident: Incident & Record<string, unknown>;
}

export interface ExternalServiceParamsUpdate {
  incidentId: string;
  incident: PartialIncident & Record<string, unknown>;
}

export interface ExternalService {
  getChoices: (fields: string[]) => Promise<GetChoicesResponse>;
  getIncident: (id: string) => Promise<ServiceNowIncident>;
  getFields: () => Promise<GetCommonFieldsResponse>;
  createIncident: (params: ExternalServiceParamsCreate) => Promise<ExternalServiceIncidentResponse>;
  updateIncident: (params: ExternalServiceParamsUpdate) => Promise<ExternalServiceIncidentResponse>;
  findIncidents: (params?: Record<string, string>) => Promise<ServiceNowIncident>;
  getUrl: () => string;
  checkInstance: (res: AxiosResponse) => void;
  getApplicationInformation: () => Promise<GetApplicationInfoResponse>;
  checkIfApplicationIsInstalled: () => Promise<void>;
}

export type PushToServiceApiParams = ExecutorSubActionPushParams;
export type PushToServiceApiParamsITSM = ExecutorSubActionPushParamsITSM;
export type PushToServiceApiParamsSIR = ExecutorSubActionPushParamsSIR;

export interface ExternalServiceApiHandlerArgs<T = ExternalService> {
  externalService: T;
  logger: Logger;
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

export interface PushToServiceApiHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: PushToServiceApiParams;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
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

export interface GetCommonFieldsHandlerArgs extends ExternalServiceApiHandlerArgs {
  params: ExecutorSubActionCommonFieldsParams;
}

export interface GetChoicesHandlerArgs {
  externalService: Partial<ExternalService> & { getChoices: ExternalService['getChoices'] };
  logger: Logger;
  params: ExecutorSubActionGetChoicesParams;
}

export interface ServiceNowIncident {
  sys_id: string;
  number: string;
  sys_created_on: string;
  sys_updated_on: string;
  [x: string]: unknown;
}

export interface ExternalServiceAPI {
  getChoices: (args: GetChoicesHandlerArgs) => Promise<GetChoicesResponse>;
  getFields: (args: GetCommonFieldsHandlerArgs) => Promise<GetCommonFieldsResponse>;
  handshake: (args: HandshakeApiHandlerArgs) => Promise<void>;
  pushToService: (args: PushToServiceApiHandlerArgs) => Promise<PushToServiceResponse>;
  getIncident: (args: GetIncidentApiHandlerArgs) => Promise<ServiceNowIncident>;
}

export interface ExternalServiceCommentResponse {
  commentId: string;
  pushedDate: string;
  externalCommentId?: string;
}

type TypeNullOrUndefined<T> = T | null | undefined;

export interface ServiceNowError {
  error: TypeNullOrUndefined<{
    message: TypeNullOrUndefined<string>;
    detail: TypeNullOrUndefined<string>;
  }>;
  status: TypeNullOrUndefined<string>;
}

export type ResponseError = AxiosError<ServiceNowError>;

export interface ImportSetApiResponseSuccess {
  import_set: string;
  staging_table: string;
  result: Array<{
    display_name: string;
    display_value: string;
    record_link: string;
    status: string;
    sys_id: string;
    table: string;
    transform_map: string;
  }>;
}

export interface ImportSetApiResponseError {
  import_set: string;
  staging_table: string;
  result: Array<{
    error_message: string;
    status_message: string;
    status: string;
    transform_map: string;
  }>;
}

export type ImportSetApiResponse = ImportSetApiResponseSuccess | ImportSetApiResponseError;
export interface GetApplicationInfoResponse {
  name: string;
  scope: string;
  version: string;
}

export interface SNProductsConfigValue {
  table: string;
  appScope: string;
  useImportAPI: boolean;
  importSetTable: string;
  commentFieldKey: string;
  appId?: string;
}

export type SNProductsConfig = Record<string, SNProductsConfigValue>;

export enum ObservableTypes {
  ip4 = 'ipv4-addr',
  url = 'URL',
  sha256 = 'SHA256',
}

export interface Observable {
  value: string;
  type: ObservableTypes;
}

export interface ObservableResponse {
  value: string;
  observable_sys_id: ObservableTypes;
}

export interface ExternalServiceSIR extends ExternalService {
  addObservableToIncident: (
    observable: Observable,
    incidentID: string
  ) => Promise<ObservableResponse>;
  bulkAddObservableToIncident: (
    observables: Observable[],
    incidentID: string
  ) => Promise<ObservableResponse[]>;
}

export type ServiceFactory<T = ExternalService> = (
  credentials: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  serviceConfig: SNProductsConfigValue
) => T;

/**
 * ITOM
 */

export type ExecutorSubActionAddEventParams = TypeOf<typeof ExecutorSubActionAddEventParamsSchema>;

export interface ExternalServiceITOM {
  getChoices: ExternalService['getChoices'];
  addEvent: (params: ExecutorSubActionAddEventParams) => Promise<void>;
}

export interface AddEventApiHandlerArgs extends ExternalServiceApiHandlerArgs<ExternalServiceITOM> {
  params: ExecutorSubActionAddEventParams;
}

export interface GetCommonFieldsHandlerArgsITOM
  extends ExternalServiceApiHandlerArgs<ExternalServiceITOM> {
  params: ExecutorSubActionGetChoicesParams;
}

export interface ExternalServiceApiITOM {
  getChoices: ExternalServiceAPI['getChoices'];
  addEvent: (args: AddEventApiHandlerArgs) => Promise<void>;
}

export type ExecutorParamsITOM = TypeOf<typeof ExecutorParamsSchemaITOM>;
