/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';
import { CrossClusterReplicationServerPlugin } from './plugin';
import { configSchema, CrossClusterReplicationConfig } from './config';

export const plugin = (pluginInitializerContext: PluginInitializerContext) =>
  new CrossClusterReplicationServerPlugin(pluginInitializerContext);

export const config: PluginConfigDescriptor<CrossClusterReplicationConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    ui: true,
  },
};
