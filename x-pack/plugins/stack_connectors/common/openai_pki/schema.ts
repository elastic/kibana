/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_OPENAI_MODEL } from '../openai/constants';

// Connector schema
export const ConfigSchema = schema.object({
  apiUrl: schema.string(),
  defaultModel: schema.string({ defaultValue: DEFAULT_OPENAI_MODEL }),
  headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  certPath: schema.string(),
  keyPath: schema.string(),
});

export const SecretsSchema = schema.object({ apiKey: schema.string() });

// Reuse the same action schemas as OpenAI since the API interface is the same
export {
  RunActionParamsSchema,
  RunActionResponseSchema,
  DashboardActionParamsSchema,
  DashboardActionResponseSchema,
  StreamActionParamsSchema,
  StreamingResponseSchema,
  InvokeAIActionParamsSchema,
  InvokeAIActionResponseSchema,
} from '../openai/schema'; 