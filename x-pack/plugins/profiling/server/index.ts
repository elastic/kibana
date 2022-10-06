/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { ProfilingPlugin } from './plugin';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  elasticsearch: schema.maybe(
    schema.object({
      hosts: schema.string(),
      username: schema.string(),
      password: schema.string(),
    })
  ),
  workers: schema.object(
    {
      min: schema.number({ defaultValue: 2 }),
      max: schema.number({ defaultValue: 4 }),
    },
    { defaultValue: { min: 2, max: 4 } }
  ),
});

export type ProfilingConfig = TypeOf<typeof configSchema>;

// plugin config
export const config: PluginConfigDescriptor<ProfilingConfig> = {
  schema: configSchema,
};

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new ProfilingPlugin(initializerContext);
}

export type { ProfilingPluginSetup, ProfilingPluginStart } from './types';
