/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  BedrockConfigSchema,
  BedrockSecretsSchema,
  BedrockRunActionParamsSchema,
  BedrockRunActionResponseSchema,
  BedrockDashboardActionParamsSchema,
  BedrockDashboardActionResponseSchema,
  BedrockRunGenAIActionParamsSchema,
} from './schema';

export type BedrockConfig = TypeOf<typeof BedrockConfigSchema>;
export type BedrockSecrets = TypeOf<typeof BedrockSecretsSchema>;
export type BedrockRunActionParams = TypeOf<typeof BedrockRunActionParamsSchema>;
export type BedrockRunGenAIActionParams = TypeOf<typeof BedrockRunGenAIActionParamsSchema>;
export type BedrockRunActionResponse = TypeOf<typeof BedrockRunActionResponseSchema>;
export type BedrockDashboardActionParams = TypeOf<typeof BedrockDashboardActionParamsSchema>;
export type BedrockDashboardActionResponse = TypeOf<typeof BedrockDashboardActionResponseSchema>;
