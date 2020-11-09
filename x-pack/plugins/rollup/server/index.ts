/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';
import { RollupPlugin } from './plugin';
import { configSchema, RollupConfig } from './config';

export { RollupPluginSetup } from './plugin';

export const plugin = (pluginInitializerContext: PluginInitializerContext) =>
  new RollupPlugin(pluginInitializerContext);

export const config: PluginConfigDescriptor<RollupConfig> = {
  schema: configSchema,
};
