/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


import { schema } from '@kbn/config-schema';
import { DEFAULT_GEMINI_MODEL } from './constants';

// Connector schema
export const ConfigSchema = schema.object({
  apiUrl: schema.string(),
  defaultModel: schema.string({ defaultValue: DEFAULT_GEMINI_MODEL }),
  gcpRegion: schema.string(),
  gcpProjectID: schema.string(),
});

export const SecretsSchema = schema.object({
  accessToken: schema.string(),
});

export const RunActionParamsSchema = schema.object({
  body: schema.string(),
  model: schema.maybe(schema.string()),
  signal: schema.maybe(schema.any()),
  timeout: schema.maybe(schema.number()),
});

export const InvokeAIActionParamsSchema = schema.object({
  messages: schema.any(),
  // messages: schema.arrayOf(
  //   schema.object({
  //     role: schema.string(),
  //     content: schema.string(),
  //   })
  // ),
  model: schema.maybe(schema.string()),
  temperature: schema.maybe(schema.number()),
  stopSequences: schema.maybe(schema.arrayOf(schema.string())),
  signal: schema.maybe(schema.any()),
  // system: schema.maybe(schema.string()),
  timeout: schema.maybe(schema.number()),
});

export const InvokeAIActionResponseSchema = schema.object({
  message: schema.string(),
});

export const StreamActionParamsSchema = schema.object({
  body: schema.string(),
  model: schema.maybe(schema.string()),
});

export const RunApiLatestResponseSchema = schema.object(
  {
    candidates: schema.any(),
    usageMetadata: schema.any(),
  }
);

export const RunActionResponseSchema = schema.object(
  {
    completion: schema.string(),
    stop_reason: schema.maybe(schema.string()),
    usage: schema.maybe(
      schema.object({
        input_tokens: schema.number(),
        output_tokens: schema.number(),
      })
    ),
  },
  { unknowns: 'ignore' }
);

export const StreamingResponseSchema = schema.any();

// Run action schema
export const DashboardActionParamsSchema = schema.object({
  dashboardId: schema.string(),
});

export const DashboardActionResponseSchema = schema.object({
  available: schema.boolean(),
});
