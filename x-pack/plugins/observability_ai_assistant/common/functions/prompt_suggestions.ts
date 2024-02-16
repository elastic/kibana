/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FromSchema } from 'json-schema-to-ts';

export const promptSuggestionsFunctionDefinition = {
  name: 'prompt_suggestions',
  contexts: ['core' as const],

  description:
    'Use this function to suggest questions that the user can ask to continue the conversation. Call this for every message.',
  descriptionForUser:
    'This function allows the Elastic Assistant to guide the user to the next step in the conversation.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      suggestions: {
        type: 'array',
        minItems: 1,
        maxItems: 4,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: {
              type: 'string',
              additionalProperties: false,
              description: 'The title of the suggestion',
            },
            prompt: {
              type: 'string',
              additionalProperties: false,
              description: 'The prompt that the user can use to continue the conversation',
            },
          },
        },
      },
    },
    required: ['suggestions' as const],
  } as const,
};

export type PromptSuggestionFunctionArguments = FromSchema<
  typeof promptSuggestionsFunctionDefinition['parameters']
>;
