/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
});

export type ClientAppsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ClientAppsConfig> = {
  schema: configSchema,
};

export async function plugin(initializerContext: PluginInitializerContext) {
  const { ClientAppsPlugin } = await import('./plugin');
  return new ClientAppsPlugin(initializerContext);
}
