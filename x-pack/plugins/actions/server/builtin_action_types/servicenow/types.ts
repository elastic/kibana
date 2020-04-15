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
  MapEntrySchema,
  CommentSchema,
} from './schema';

import { ServiceNow } from './lib';
import { Incident, IncidentResponse } from './lib/types';

// config definition
export type ConfigType = TypeOf<typeof ConfigSchema>;

// secrets definition
export type SecretsType = TypeOf<typeof SecretsSchema>;

export type ExecutorParams = TypeOf<typeof ParamsSchema>;

export type CasesConfigurationType = TypeOf<typeof CasesConfigurationSchema>;
export type MapEntry = TypeOf<typeof MapEntrySchema>;
export type Comment = TypeOf<typeof CommentSchema>;

export type Mapping = Map<string, any>;

export interface Params extends ExecutorParams {
  incident: Record<string, any>;
}
export interface CreateHandlerArguments {
  serviceNow: ServiceNow;
  params: Params;
  comments: Comment[];
  mapping: Mapping;
}

export type UpdateHandlerArguments = CreateHandlerArguments & {
  incidentId: string;
};

export type IncidentHandlerArguments = CreateHandlerArguments & {
  incidentId: string | null;
};

export interface HandlerResponse extends IncidentResponse {
  comments?: SimpleComment[];
}

export interface SimpleComment {
  commentId: string;
  pushedDate: string;
}

export interface AppendFieldArgs {
  value: string;
  prefix?: string;
  suffix?: string;
}

export interface KeyAny {
  [index: string]: string;
}

export interface AppendInformationFieldArgs {
  value: string;
  user: string;
  date: string;
  mode: string;
}

export interface TransformerArgs {
  value: string;
  date?: string;
  user?: string;
  previousValue?: string;
}

export interface PrepareFieldsForTransformArgs {
  params: Params;
  mapping: Mapping;
  defaultPipes?: string[];
}

export interface PipedField {
  key: string;
  value: string;
  actionType: string;
  pipes: string[];
}

export interface TransformFieldsArgs {
  params: Params;
  fields: PipedField[];
  currentIncident?: Incident;
}
