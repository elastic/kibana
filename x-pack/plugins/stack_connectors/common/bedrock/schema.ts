/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_BEDROCK_MODEL } from './constants';

// Connector schema
export const ConfigSchema = schema.object({
  apiUrl: schema.string(),
  defaultModel: schema.string({ defaultValue: DEFAULT_BEDROCK_MODEL }),
});

export const SecretsSchema = schema.object({
  accessKey: schema.string(),
  secret: schema.string(),
});

export const RunActionParamsSchema = schema.object({
  body: schema.string(),
  model: schema.maybe(schema.string()),
});

export const InvokeAIActionParamsSchema = schema.object({
  messages: schema.arrayOf(
    schema.object({
      role: schema.string(),
      content: schema.string(),
    })
  ),
  model: schema.maybe(schema.string()),
  temperature: schema.maybe(schema.number()),
  stopSequences: schema.maybe(schema.arrayOf(schema.string())),
  system: schema.maybe(schema.string()),
  // abort signal from client
  signal: schema.maybe(schema.any()),
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
    stop_reason: schema.maybe(schema.string()),
    usage: schema.object({
      input_tokens: schema.number(),
      output_tokens: schema.number(),
    }),
    content: schema.arrayOf(
      schema.object(
        { type: schema.string(), text: schema.maybe(schema.string()) },
        { unknowns: 'allow' }
      )
    ),
  },
  { unknowns: 'allow' }
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
