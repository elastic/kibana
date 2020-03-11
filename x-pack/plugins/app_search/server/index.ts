/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { AppSearchPlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new AppSearchPlugin(initializerContext);
};

export const configSchema = schema.object({
  host: schema.maybe(schema.string()),
});

type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    host: true,
  },
};
