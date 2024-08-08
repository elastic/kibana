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
  providerSchema: schema.arrayOf(schema.object({}, { unknowns: 'allow' }), { defaultValue: [] }),
  providerConfig: schema.object({}, { unknowns: 'allow', defaultValue: {} }),
});

export const SecretsSchema = schema.object({
  providerSecrets: schema.object({}, { unknowns: 'allow', defaultValue: {} }),
});

export const ChatCompleteParamsSchema = schema.object({
  input: schema.string(),
  model: schema.maybe(schema.string()),
  signal: schema.maybe(schema.any()),
  timeout: schema.maybe(schema.number()),
  temperature: schema.maybe(schema.number()),
});

export const ChatCompleteResponseSchema = schema.object({
  completion: schema.object({
    result: schema.number(),
  }),
});

export const StreamingResponseSchema = schema.stream();
