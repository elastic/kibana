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
  InvokeAIActionParamsSchema,
  InvokeAIActionResponseSchema,
  StreamActionParamsSchema,
  StreamingResponseSchema,
} from './schema';

export type Config = TypeOf<typeof ConfigSchema>;
export type Secrets = TypeOf<typeof SecretsSchema>;
export type RunActionParams = TypeOf<typeof RunActionParamsSchema>;
export type InvokeAIActionParams = TypeOf<typeof InvokeAIActionParamsSchema>;
export type InvokeAIActionResponse = TypeOf<typeof InvokeAIActionResponseSchema>;
export type RunActionResponse = TypeOf<typeof RunActionResponseSchema>;
export type StreamActionParams = TypeOf<typeof StreamActionParamsSchema>;
export type StreamingResponse = TypeOf<typeof StreamingResponseSchema>;
