/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';

import { EnterpriseSearchPlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new EnterpriseSearchPlugin(initializerContext);
};

export const configSchema = schema.object({
  host: schema.maybe(schema.string()),
  enabled: schema.boolean({ defaultValue: true }),
  accessCheckTimeout: schema.number({ defaultValue: 5000 }),
  accessCheckTimeoutWarning: schema.number({ defaultValue: 300 }),
});

export type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    host: true,
  },
};
