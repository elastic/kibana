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

export interface Config {
  apiProvider: OpenAiProviderType;
  apiUrl: string;
  defaultModel?: string;
  // Add optional PKI fields
  certPath?: string;
  keyPath?: string;
  headers?: Record<string, string>;
}

export interface Secrets {
  apiKey: string;
}
export type RunActionParams = TypeOf<typeof RunActionParamsSchema>;
export type InvokeAIActionParams = TypeOf<typeof InvokeAIActionParamsSchema>;
export type InvokeAIActionResponse = TypeOf<typeof InvokeAIActionResponseSchema>;
export type RunActionResponse = TypeOf<typeof RunActionResponseSchema>;
export type DashboardActionParams = TypeOf<typeof DashboardActionParamsSchema>;
export type DashboardActionResponse = TypeOf<typeof DashboardActionResponseSchema>;
export type StreamActionParams = TypeOf<typeof StreamActionParamsSchema>;