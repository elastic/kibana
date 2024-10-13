/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const ConfigSchema = schema.object({
  provider: schema.string(),
  taskType: schema.string(),
  inferenceId: schema.string(),
  providerConfig: schema.object({}, { unknowns: 'allow', defaultValue: {} }),
  taskTypeConfig: schema.object({}, { unknowns: 'allow', defaultValue: {} }),
});

export const SecretsSchema = schema.object({
  providerSecrets: schema.object({}, { unknowns: 'allow', defaultValue: {} }),
});

export const ChatCompleteParamsSchema = schema.object({
  input: schema.string(),
});

export const ChatCompleteResponseSchema = schema.arrayOf(
  schema.object({
    result: schema.string(),
  }),
  { defaultValue: [] }
);

export const RerankParamsSchema = schema.object({
  input: schema.arrayOf(schema.string(), { defaultValue: [] }),
  query: schema.string(),
});

export const RerankResponseSchema = schema.arrayOf(
  schema.object({
    text: schema.maybe(schema.string()),
    index: schema.number(),
    score: schema.number(),
  }),
  { defaultValue: [] }
);

export const SparseEmbeddingParamsSchema = schema.object({
  input: schema.string(),
});

export const SparseEmbeddingResponseSchema = schema.arrayOf(
  schema.object({}, { unknowns: 'allow' }),
  { defaultValue: [] }
);

export const TextEmbeddingParamsSchema = schema.object({
  input: schema.string(),
  inputType: schema.string(),
});

export const TextEmbeddingResponseSchema = schema.arrayOf(
  schema.object({
    embedding: schema.arrayOf(schema.any(), { defaultValue: [] }),
  }),
  { defaultValue: [] }
);

export const StreamingResponseSchema = schema.stream();
