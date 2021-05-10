/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from 'kibana/server';
import { schema } from '@kbn/config-schema';

import { DashboardModeServerPlugin } from './plugin';

export const config: PluginConfigDescriptor = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
};

export function plugin(initializerContext: PluginInitializerContext) {
  return new DashboardModeServerPlugin(initializerContext);
}

export { DashboardModeServerPlugin as Plugin };
