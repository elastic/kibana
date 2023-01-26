/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export interface MlConfigType {
  trainedModelsServer?: {
    url?: string;
    username?: string;
    password?: string;
  };
}

export const configSchema = schema.object({
  trainedModelsServer: schema.object({
    url: schema.maybe(schema.string()),
    username: schema.maybe(schema.string()),
    password: schema.maybe(schema.string()),
  }),
});

export type MlXPackConfig = TypeOf<typeof configSchema>;
