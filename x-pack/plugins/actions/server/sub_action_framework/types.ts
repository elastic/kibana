/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import type { LicenseType } from '@kbn/licensing-plugin/common/types';

import type { Method, AxiosRequestConfig } from 'axios';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type {
  ActionTypeParams,
  RenderParameterTemplates,
  Services,
  ValidatorType as ValidationSchema,
} from '../types';
import type { SubActionConnector } from './sub_action_connector';

export interface ServiceParams<Config, Secrets> {
  /**
   * The type is the connector type id. For example ".servicenow"
   * The id is the connector's SavedObject UUID.
   */
  connector: { id: string; type: string };
  config: Config;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
  secrets: Secrets;
  services: Services;
}

export type SubActionRequestParams<R> = {
  url: string;
  responseSchema: Type<R>;
  method?: Method;
} & AxiosRequestConfig;

export type IService<Config, Secrets> = new (
  params: ServiceParams<Config, Secrets>
) => SubActionConnector<Config, Secrets>;

export type IServiceAbstract<Config, Secrets> = abstract new (
  params: ServiceParams<Config, Secrets>
) => SubActionConnector<Config, Secrets>;

export enum ValidatorType {
  CONFIG,
  SECRETS,
}

interface Validate<T> {
  validator: ValidateFn<T>;
}

export type ValidateFn<T> = NonNullable<ValidationSchema<T>['customValidator']>;

interface ConfigValidator<T> extends Validate<T> {
  type: ValidatorType.CONFIG;
}

interface SecretsValidator<T> extends Validate<T> {
  type: ValidatorType.SECRETS;
}

export type Validators<Config, Secrets> = Array<
  ConfigValidator<Config> | SecretsValidator<Secrets>
>;

export interface SubActionConnectorType<Config, Secrets> {
  id: string;
  name: string;
  minimumLicenseRequired: LicenseType;
  supportedFeatureIds: string[];
  schema: {
    config: Type<Config>;
    secrets: Type<Secrets>;
  };
  validators?: Array<ConfigValidator<Config> | SecretsValidator<Secrets>>;
  Service: IService<Config, Secrets>;
  renderParameterTemplates?: RenderParameterTemplates<ExecutorParams>;
}

export interface ExecutorParams extends ActionTypeParams {
  subAction: string;
  subActionParams: Record<string, unknown>;
}

export type ExtractFunctionKeys<T> = {
  [P in keyof T]-?: T[P] extends Function ? P : never;
}[keyof T];

export interface SubAction {
  name: string;
  method: string;
  schema: Type<unknown> | null;
}

export interface PushToServiceParams {
  incident: {
    externalId: string | null;
    [x: string]: unknown;
  };
  comments: Array<{ commentId: string; comment: string }>;
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
export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}
