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
  InvokeAIActionParamsSchema,
  InvokeAIActionResponseSchema,
} from './schema';

export type BedrockConfig = TypeOf<typeof BedrockConfigSchema>;
export type BedrockSecrets = TypeOf<typeof BedrockSecretsSchema>;
export type BedrockRunActionParams = TypeOf<typeof BedrockRunActionParamsSchema>;
export type InvokeAIActionParams = TypeOf<typeof InvokeAIActionParamsSchema>;
export type InvokeAIActionResponse = TypeOf<typeof InvokeAIActionResponseSchema>;
export type BedrockRunActionResponse = TypeOf<typeof BedrockRunActionResponseSchema>;
