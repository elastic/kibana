/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  ConfigSchema,
  SecretsSchema,
  StreamingResponseSchema,
  ChatCompleteParamsSchema,
  ChatCompleteResponseSchema,
  RerankParamsSchema,
  RerankResponseSchema,
  SparseEmbeddingParamsSchema,
  SparseEmbeddingResponseSchema,
  TextEmbeddingParamsSchema,
  TextEmbeddingResponseSchema,
} from './schema';
import { ConfigProperties } from '../dynamic_config/types';

export type Config = TypeOf<typeof ConfigSchema>;
export type Secrets = TypeOf<typeof SecretsSchema>;

export type ChatCompleteParams = TypeOf<typeof ChatCompleteParamsSchema>;
export type ChatCompleteResponse = TypeOf<typeof ChatCompleteResponseSchema>;

export type RerankParams = TypeOf<typeof RerankParamsSchema>;
export type RerankResponse = TypeOf<typeof RerankResponseSchema>;

export type SparseEmbeddingParams = TypeOf<typeof SparseEmbeddingParamsSchema>;
export type SparseEmbeddingResponse = TypeOf<typeof SparseEmbeddingResponseSchema>;

export type TextEmbeddingParams = TypeOf<typeof TextEmbeddingParamsSchema>;
export type TextEmbeddingResponse = TypeOf<typeof TextEmbeddingResponseSchema>;

export type StreamingResponse = TypeOf<typeof StreamingResponseSchema>;

export type FieldsConfiguration = Record<string, ConfigProperties>;

export interface InferenceTaskType {
  task_type: string;
  configuration: FieldsConfiguration;
}

export interface InferenceProvider {
  provider: string;
  task_types: InferenceTaskType[];
  logo?: string;
  configuration: FieldsConfiguration;
}
