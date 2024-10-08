/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_GEMINI_MODEL } from './constants';

export const ConfigSchema = schema.object({
  apiUrl: schema.string(),
  defaultModel: schema.string({ defaultValue: DEFAULT_GEMINI_MODEL }),
  gcpRegion: schema.string(),
  gcpProjectID: schema.string(),
});

export const SecretsSchema = schema.object({
  credentialsJson: schema.string(),
});

export const RunActionParamsSchema = schema.object({
  body: schema.any(),
  model: schema.maybe(schema.string()),
  signal: schema.maybe(schema.any()),
  timeout: schema.maybe(schema.number()),
  temperature: schema.maybe(schema.number()),
  stopSequences: schema.maybe(schema.arrayOf(schema.string())),
  raw: schema.maybe(schema.boolean()),
});

export const RunApiResponseSchema = schema.object(
  {
    candidates: schema.any(),
    usageMetadata: schema.object({
      promptTokenCount: schema.number(),
      candidatesTokenCount: schema.number(),
      totalTokenCount: schema.number(),
    }),
  },
  { unknowns: 'ignore' } // unknown keys will NOT fail validation, but will be removed
);

export const RunActionResponseSchema = schema.object(
  {
    completion: schema.string(),
    stop_reason: schema.maybe(schema.string()),
    usageMetadata: schema.maybe(
      schema.object({
        promptTokenCount: schema.number(),
        candidatesTokenCount: schema.number(),
        totalTokenCount: schema.number(),
      })
    ),
  },
  { unknowns: 'ignore' }
);

export const RunActionRawResponseSchema = schema.any();

export const InvokeAIActionParamsSchema = schema.object({
  messages: schema.any(),
  model: schema.maybe(schema.string()),
  temperature: schema.maybe(schema.number()),
  stopSequences: schema.maybe(schema.arrayOf(schema.string())),
  signal: schema.maybe(schema.any()),
  timeout: schema.maybe(schema.number()),
  tools: schema.maybe(schema.arrayOf(schema.any())),
});

export const InvokeAIRawActionParamsSchema = schema.object({
  messages: schema.any(),
  model: schema.maybe(schema.string()),
  temperature: schema.maybe(schema.number()),
  stopSequences: schema.maybe(schema.arrayOf(schema.string())),
  signal: schema.maybe(schema.any()),
  timeout: schema.maybe(schema.number()),
  tools: schema.maybe(schema.arrayOf(schema.any())),
});

export const InvokeAIActionResponseSchema = schema.object({
  message: schema.string(),
  usageMetadata: schema.maybe(
    schema.object({
      promptTokenCount: schema.number(),
      candidatesTokenCount: schema.number(),
      totalTokenCount: schema.number(),
    })
  ),
});

export const InvokeAIRawActionResponseSchema = schema.any();

export const StreamingResponseSchema = schema.any();

export const DashboardActionParamsSchema = schema.object({
  dashboardId: schema.string(),
});

export const DashboardActionResponseSchema = schema.object({
  available: schema.boolean(),
});
