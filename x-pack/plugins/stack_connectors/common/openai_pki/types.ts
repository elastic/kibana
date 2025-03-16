/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  ConfigSchema,
  SecretsSchema,
  RunActionParamsSchema,
  RunActionResponseSchema,
  DashboardActionParamsSchema,
  DashboardActionResponseSchema,
  StreamActionParamsSchema,
  InvokeAIActionParamsSchema,
  InvokeAIActionResponseSchema,
} from './schema';

export type Config = TypeOf<typeof ConfigSchema>;
export type Secrets = TypeOf<typeof SecretsSchema>;

// Reuse the same action types as OpenAI since the API interface is the same
export type {
  RunActionParams,
  RunActionResponse,
  DashboardActionParams,
  DashboardActionResponse,
  StreamActionParams,
  InvokeAIActionParams,
  InvokeAIActionResponse,
} from '../openai/types'; 