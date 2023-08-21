/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  GenAiConfigSchema,
  GenAiSecretsSchema,
  GenAiRunActionParamsSchema,
  GenAiRunActionResponseSchema,
  GenAiDashboardActionParamsSchema,
  GenAiDashboardActionResponseSchema,
  GenAiStreamActionParamsSchema,
} from './schema';

export type GenAiConfig = TypeOf<typeof GenAiConfigSchema>;
export type GenAiSecrets = TypeOf<typeof GenAiSecretsSchema>;
export type GenAiRunActionParams = TypeOf<typeof GenAiRunActionParamsSchema>;
export type GenAiRunActionResponse = TypeOf<typeof GenAiRunActionResponseSchema>;
export type GenAiDashboardActionParams = TypeOf<typeof GenAiDashboardActionParamsSchema>;
export type GenAiDashboardActionResponse = TypeOf<typeof GenAiDashboardActionResponseSchema>;
export type GenAiStreamActionParams = TypeOf<typeof GenAiStreamActionParamsSchema>;
