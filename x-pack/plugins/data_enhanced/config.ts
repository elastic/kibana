/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { searchSessionsConfigSchema } from '@kbn/data-plugin/config';

export const configSchema = schema.object({
  search: schema.object({
    sessions: searchSessionsConfigSchema,
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
