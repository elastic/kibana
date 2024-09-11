/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_PROVIDER, DEFAULT_TASK_TYPE } from './constants';

export const ConfigSchema = schema.object({
  provider: schema.string({ defaultValue: DEFAULT_PROVIDER }),
  taskType: schema.string({ defaultValue: DEFAULT_TASK_TYPE }),
  inferenceId: schema.string(),
  providerSchema: schema.arrayOf(
    schema.object(
      {
        key: schema.string(),
        category: schema.maybe(schema.string()),
        default_value: schema.maybe(
          schema.nullable(schema.oneOf([schema.string(), schema.number(), schema.boolean()]))
        ),
        depends_on: schema.maybe(schema.arrayOf(schema.object({}))),
        display: schema.string(), // DisplayType;
        label: schema.string(),
        options: schema.maybe(
          schema.arrayOf(schema.object({}, { unknowns: 'allow', defaultValue: {} }), {
            defaultValue: [],
          })
        ), // SelectOption[];
        order: schema.maybe(schema.number()),
        placeholder: schema.maybe(schema.string()),
        required: schema.boolean(),
        sensitive: schema.boolean(),
        tooltip: schema.maybe(schema.string()),
        type: schema.string(),
        ui_restrictions: schema.maybe(schema.arrayOf(schema.object({}), { defaultValue: [] })),
        validations: schema.maybe(schema.arrayOf(schema.object({}), { defaultValue: [] })),
        value: schema.maybe(
          schema.nullable(schema.oneOf([schema.string(), schema.number(), schema.boolean()]))
        ),
      },
      { unknowns: 'ignore' }
    ),
    { defaultValue: [] }
  ),
  providerConfig: schema.object({}, { unknowns: 'allow', defaultValue: {} }),
  taskTypeSchema: schema.maybe(
    schema.arrayOf(
      schema.object(
        {
          key: schema.string(),
          category: schema.maybe(schema.string()),
          default_value: schema.maybe(
            schema.nullable(schema.oneOf([schema.string(), schema.number(), schema.boolean()]))
          ),
          depends_on: schema.maybe(schema.arrayOf(schema.object({}))),
          display: schema.string(), // DisplayType;
          label: schema.string(),
          options: schema.maybe(
            schema.arrayOf(schema.object({}, { unknowns: 'allow', defaultValue: {} }), {
              defaultValue: [],
            })
          ), // SelectOption[];
          order: schema.maybe(schema.number()),
          placeholder: schema.maybe(schema.string()),
          required: schema.boolean(),
          sensitive: schema.boolean(),
          tooltip: schema.maybe(schema.string()),
          type: schema.string(),
          ui_restrictions: schema.maybe(schema.arrayOf(schema.object({}), { defaultValue: [] })),
          validations: schema.maybe(schema.arrayOf(schema.object({}), { defaultValue: [] })),
          value: schema.maybe(
            schema.nullable(schema.oneOf([schema.string(), schema.number(), schema.boolean()]))
          ),
        },
        { unknowns: 'ignore' }
      ),
      { defaultValue: [] }
    )
  ),
  taskTypeConfig: schema.object({}, { unknowns: 'allow', defaultValue: {} }),
});

export const SecretsSchema = schema.object({
  providerSecrets: schema.object({}, { unknowns: 'allow', defaultValue: {} }),
});

export const ChatCompleteParamsSchema = schema.object({
  input: schema.string(),
});

export const ChatCompleteResponseSchema = schema.object({
  completion: schema.arrayOf(
    schema.object({
      result: schema.string(),
    }),
    { defaultValue: [] }
  ),
});

export const RerankParamsSchema = schema.object({
  input: schema.arrayOf(schema.string(), { defaultValue: [] }),
  query: schema.string(),
});

export const RerankResponseSchema = schema.object({
  rerank: schema.arrayOf(
    schema.object({
      text: schema.string(),
      index: schema.number(),
      relevance_score: schema.number(),
    }),
    { defaultValue: [] }
  ),
});

export const SparseEmbeddingParamsSchema = schema.object({
  input: schema.string(),
});

export const SparseEmbeddingResponseSchema = schema.object({
  sparse_embedding: schema.arrayOf(schema.object({}, { unknowns: 'allow' }), { defaultValue: [] }),
});

export const TextEmbeddingParamsSchema = schema.object({
  input: schema.string(),
  inputType: schema.string(),
});

export const TextEmbeddingResponseSchema = schema.object({
  text_embedding: schema.arrayOf(
    schema.object({
      embedding: schema.arrayOf(schema.any(), { defaultValue: [] }),
    }),
    { defaultValue: [] }
  ),
});

export const StreamingResponseSchema = schema.stream();
