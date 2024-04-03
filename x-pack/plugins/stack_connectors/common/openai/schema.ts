/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_OPENAI_MODEL, OpenAiProviderType } from './constants';

// Connector schema
export const ConfigSchema = schema.oneOf([
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

export const SecretsSchema = schema.object({ apiKey: schema.string() });

// Run action schema
export const RunActionParamsSchema = schema.object({
  body: schema.string(),
});

const AIMessage = schema.object({
  role: schema.string(),
  content: schema.string(),
  name: schema.maybe(schema.string()),
  function_call: schema.maybe(
    schema.object({
      arguments: schema.string(),
      name: schema.string(),
    })
  ),
  tool_calls: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: schema.string(),
        function: schema.object({
          arguments: schema.string(),
          name: schema.string(),
        }),
        type: schema.string(),
      })
    )
  ),
  tool_call_id: schema.maybe(schema.string()),
});

// Run action schema
export const InvokeAIActionParamsSchema = schema.object({
  messages: schema.arrayOf(AIMessage),
  model: schema.maybe(schema.string()),
  functions: schema.maybe(
    schema.arrayOf(
      schema.object(
        {
          name: schema.string(),
          description: schema.string(),
          parameters: schema.object({
            type: schema.string(),
            properties: schema.object({}, { unknowns: 'allow' }),
            additionalProperties: schema.boolean(),
            $schema: schema.string(),
          }),
        },
        // Not sure if this will include other properties, we should pass them if it does
        { unknowns: 'allow' }
      )
    )
  ),
  function_call: schema.maybe(
    schema.oneOf([
      schema.literal('none'),
      schema.literal('auto'),
      schema.object(
        {
          name: schema.string(),
        },
        { unknowns: 'ignore' }
      ),
    ])
  ),
  n: schema.maybe(schema.number()),
  stop: schema.maybe(
    schema.nullable(schema.oneOf([schema.string(), schema.arrayOf(schema.string())]))
  ),
  temperature: schema.maybe(schema.number()),
  // abort signal from client
  signal: schema.maybe(schema.any()),
});

export const InvokeAIActionResponseSchema = schema.object({
  message: schema.string(),
  usage: schema.object(
    {
      prompt_tokens: schema.number(),
      completion_tokens: schema.number(),
      total_tokens: schema.number(),
    },
    { unknowns: 'ignore' }
  ),
});

// Execute action schema
export const StreamActionParamsSchema = schema.object({
  body: schema.string(),
  stream: schema.boolean({ defaultValue: false }),
  // abort signal from client
  signal: schema.maybe(schema.any()),
});

export const StreamingResponseSchema = schema.any();

export const RunActionResponseSchema = schema.object(
  {
    id: schema.maybe(schema.string()),
    object: schema.maybe(schema.string()),
    created: schema.maybe(schema.number()),
    model: schema.maybe(schema.string()),
    usage: schema.object(
      {
        prompt_tokens: schema.number(),
        completion_tokens: schema.number(),
        total_tokens: schema.number(),
      },
      { unknowns: 'ignore' }
    ),
    choices: schema.arrayOf(
      schema.object(
        {
          message: schema.object(
            {
              role: schema.string(),
              content: schema.maybe(schema.string()),
            },
            { unknowns: 'ignore' }
          ),
          finish_reason: schema.maybe(schema.string()),
          index: schema.maybe(schema.number()),
        },
        { unknowns: 'ignore' }
      )
    ),
  },
  { unknowns: 'ignore' }
);

// Run action schema
export const DashboardActionParamsSchema = schema.object({
  dashboardId: schema.string(),
});

export const DashboardActionResponseSchema = schema.object({
  available: schema.boolean(),
});
