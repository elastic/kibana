/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '../../../../src/core/server';

export const configSchema = schema.object({
  actions: schema.object({
    exploreDataInChart: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
    }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
  exposeToBrowser: {
    actions: true,
  },
};
