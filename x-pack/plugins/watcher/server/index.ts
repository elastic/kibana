/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';
import { offeringBasedSchema, schema } from '@kbn/config-schema';

export const plugin = async (ctx: PluginInitializerContext) => {
  const { WatcherServerPlugin } = await import('./plugin');
  return new WatcherServerPlugin(ctx);
};

export const config = {
  schema: schema.object({
    enabled: offeringBasedSchema({
      // Watcher is disabled in serverless; refer to the serverless.yml file as the source of truth
      // We take this approach in order to have a central place (serverless.yml) to view disabled plugins across Kibana
      serverless: schema.boolean({ defaultValue: true }),
    }),
  }),
};
