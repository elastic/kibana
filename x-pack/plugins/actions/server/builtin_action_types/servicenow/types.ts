/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';

import { ConfigSchema, SecretsSchema, ParamsSchema } from './schema';

// config definition
export type ConfigType = TypeOf<typeof ConfigSchema>;

// secrets definition
export type SecretsType = TypeOf<typeof SecretsSchema>;

export type ParamsType = TypeOf<typeof ParamsSchema>;
