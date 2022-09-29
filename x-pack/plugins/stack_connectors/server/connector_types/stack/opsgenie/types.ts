/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TypeOf } from '@kbn/config-schema';
import {
  CloseAlertParamsSchema,
  ConfigSchema,
  CreateAlertParamsSchema,
  SecretsSchema,
} from './schema';

export type Config = TypeOf<typeof ConfigSchema>;
export type Secrets = TypeOf<typeof SecretsSchema>;

export type CreateAlertParams = TypeOf<typeof CreateAlertParamsSchema>;
export type CloseAlertParams = TypeOf<typeof CloseAlertParamsSchema>;
