/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  IncidentConfigurationSchema,
  MapRecordSchema,
  CommentSchema,
  EntityInformationSchema,
} from './schema';

export type IncidentConfiguration = TypeOf<typeof IncidentConfigurationSchema>;
export type MapRecord = TypeOf<typeof MapRecordSchema>;
export type Comment = TypeOf<typeof CommentSchema>;
export type EntityInformation = TypeOf<typeof EntityInformationSchema>;

export interface ExternalServiceCommentResponse {
  commentId: string;
  pushedDate: string;
  externalCommentId?: string;
}

export interface PipedField {
  key: string;
  value: string;
  actionType: string;
  pipes: string[];
}

export interface TransformFieldsArgs<P, S> {
  params: P;
  fields: PipedField[];
  currentIncident?: S;
}

export interface TransformerArgs {
  value: string;
  date?: string;
  user?: string;
  previousValue?: string;
}

export interface AnyParams {
  [index: string]: string | number | object | undefined | null;
}

export interface PrepareFieldsForTransformArgs {
  externalCase: Record<string, string>;
  mapping: Map<string, MapRecord>;
  defaultPipes?: string[];
}
