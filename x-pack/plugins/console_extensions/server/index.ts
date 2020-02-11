/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext, PluginConfigDescriptor } from 'kibana/server';

import { config as configSchema, ConfigType } from './config';
import { ConsoleExtensionsServerPlugin } from './plugin';

export const plugin = (ctx: PluginInitializerContext) => new ConsoleExtensionsServerPlugin(ctx);

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
};
