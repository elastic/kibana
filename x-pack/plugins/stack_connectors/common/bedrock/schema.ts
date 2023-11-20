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
});

export const InvokeAIActionResponseSchema = schema.object({
  message: schema.string(),
});

export const StreamActionParamsSchema = schema.object({
  body: schema.string(),
  model: schema.maybe(schema.string()),
});

export const RunActionResponseSchema = schema.object(
  {
    completion: schema.string(),
    stop_reason: schema.maybe(schema.string()),
  },
  { unknowns: 'ignore' }
);

export const StreamingResponseSchema = schema.any();
