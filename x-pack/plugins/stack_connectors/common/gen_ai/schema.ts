/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_OPENAI_MODEL, OpenAiProviderType } from './constants';

// Connector schema
export const GenAiConfigSchema = schema.oneOf([
  schema.object({
    apiProvider: schema.oneOf([schema.literal(OpenAiProviderType.AzureAi)]),
    apiUrl: schema.string(),
  }),
  schema.object({
    apiProvider: schema.oneOf([schema.literal(OpenAiProviderType.OpenAi)]),
    apiUrl: schema.string(),
    defaultModel: schema.string({ defaultValue: DEFAULT_OPENAI_MODEL }),
  }),
]);

export const GenAiSecretsSchema = schema.object({ apiKey: schema.string() });

// Run action schema
export const GenAiRunActionParamsSchema = schema.object({
  body: schema.string(),
});

// Execute action schema
export const GenAiStreamActionParamsSchema = schema.object({
  body: schema.string(),
  stream: schema.boolean({ defaultValue: false }),
});

export const GenAiStreamingResponseSchema = schema.any();
export const GenAiRunActionResponseSchema = schema.object(
  {
    id: schema.string(),
    object: schema.string(),
    created: schema.number(),
    model: schema.string(),
    usage: schema.object({
      prompt_tokens: schema.number(),
      completion_tokens: schema.number(),
      total_tokens: schema.number(),
    }),
    choices: schema.arrayOf(
      schema.object({
        message: schema.object({
          role: schema.string(),
          content: schema.string(),
        }),
        finish_reason: schema.string(),
        index: schema.number(),
      })
    ),
  },
  { unknowns: 'ignore' }
);

// Run action schema
export const GenAiDashboardActionParamsSchema = schema.object({
  dashboardId: schema.string(),
});

export const GenAiDashboardActionResponseSchema = schema.object({
  available: schema.boolean(),
});
