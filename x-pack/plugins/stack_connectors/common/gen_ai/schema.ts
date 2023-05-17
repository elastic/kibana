/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// Connector schema
export const GenAiConfigSchema = schema.object({
  apiProvider: schema.string(),
  apiUrl: schema.string(),
});

export const GenAiSecretsSchema = schema.object({ apiKey: schema.string() });

// Run action schema
export const GenAiRunActionParamsSchema = schema.object({
  body: schema.string(),
});
export const GenAiRunActionResponseSchema = schema.object({}, { unknowns: 'ignore' });
