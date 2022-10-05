/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  theme: schema.object({
    logo: schema.maybe(schema.string()),
    pageTitle: schema.maybe(schema.string()),
    welcomeMessage: schema.maybe(schema.string()),
    mark: schema.maybe(schema.string()),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
