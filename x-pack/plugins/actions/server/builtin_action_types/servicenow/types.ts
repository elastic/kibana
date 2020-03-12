/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';

import {
  ConfigSchema,
  SecretsSchema,
  ParamsSchema,
  CasesConfigurationSchema,
  MapsSchema,
  CommentSchema,
} from './schema';

import { ServiceNow } from './lib';

// config definition
export type ConfigType = TypeOf<typeof ConfigSchema>;

// secrets definition
export type SecretsType = TypeOf<typeof SecretsSchema>;

export type ParamsType = TypeOf<typeof ParamsSchema>;

export type CasesConfigurationType = TypeOf<typeof CasesConfigurationSchema>;
export type MapsType = TypeOf<typeof MapsSchema>;
export type CommentType = TypeOf<typeof CommentSchema>;

export type FinalMapping = Map<string, any>;

export interface CreateHandlerArguments {
  serviceNow: ServiceNow;
  params: any;
  comments: CommentType[];
  mapping: FinalMapping;
}

export type UpdateParamsType = Partial<ParamsType>;

export type UpdateHandlerArguments = CreateHandlerArguments & {
  incidentId: string;
};

export type IncidentHandlerArguments = CreateHandlerArguments & {
  incidentId?: string;
};

export interface IncidentCreationResponse {
  incidentId: string;
  number: string;
  comments?: CommentsZipped[];
  pushedDate: string;
}

export interface CommentsZipped {
  commentId: string;
  pushedDate: string;
}

export interface ApplyActionTypeToFieldsArgs {
  params: any;
  mapping: FinalMapping;
  incident: Record<string, any>;
}

export interface AppendFieldArgs {
  value: string;
  prefix?: string;
  suffix?: string;
}

export interface KeyAny {
  [index: string]: string;
}
