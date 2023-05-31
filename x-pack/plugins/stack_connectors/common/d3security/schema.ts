/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { D3SecuritySeverity } from './constants';

// Connector schema
export const D3SecurityConfigSchema = schema.object({
  url: schema.string(),
  severity: schema.string({ defaultValue: D3SecuritySeverity.EMPTY }),
  eventType: schema.string({ defaultValue: '' }),
});

export const D3SecuritySecretsSchema = schema.object({ token: schema.string() });

// Run action schema
export const D3SecurityRunActionParamsSchema = schema.object({
  body: schema.maybe(schema.string()),
  severity: schema.maybe(schema.string()),
  eventType: schema.maybe(schema.string()),
});

export const D3SecurityRunActionResponseSchema = schema.object(
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
