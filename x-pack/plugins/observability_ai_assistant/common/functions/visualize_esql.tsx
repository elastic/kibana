/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FromSchema } from 'json-schema-to-ts';

export const visualizeESQLFunction = {
  name: 'visualize_query',
  description: 'Use this function suggest charts for ES|QL queries.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      query: {
        type: 'string',
      },
    },
    required: ['query'],
  } as const,
  contexts: ['core'],
};

export type VisualizeESQLFunctionArguments = FromSchema<typeof visualizeESQLFunction['parameters']>;
