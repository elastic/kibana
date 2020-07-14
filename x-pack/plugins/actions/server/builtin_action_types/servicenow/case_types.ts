/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { TypeOf } from '@kbn/config-schema';
import {
  ExecutorSubActionGetIncidentParamsSchema,
  ExecutorSubActionHandshakeParamsSchema,
} from './schema';
import { IncidentConfigurationSchema, MapRecordSchema } from './case_shema';
import {
  PushToServiceApiParams,
  ExternalServiceIncidentResponse,
  ExternalServiceParams,
} from './types';

export interface CreateCommentRequest {
  [key: string]: string;
}

export type IncidentConfiguration = TypeOf<typeof IncidentConfigurationSchema>;
export type MapRecord = TypeOf<typeof MapRecordSchema>;

export interface ExternalServiceCommentResponse {
  commentId: string;
  pushedDate: string;
  externalCommentId?: string;
}

export type ExecutorSubActionGetIncidentParams = TypeOf<
  typeof ExecutorSubActionGetIncidentParamsSchema
>;

export type ExecutorSubActionHandshakeParams = TypeOf<
  typeof ExecutorSubActionHandshakeParamsSchema
>;

export interface PushToServiceResponse extends ExternalServiceIncidentResponse {
  comments?: ExternalServiceCommentResponse[];
}

export interface PipedField {
  key: string;
  value: string;
  actionType: string;
  pipes: string[];
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
