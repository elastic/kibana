/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { StackConnectorsPlugin } from './plugin';
import { configSchema, ConfigSchema } from './config';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
};

export const plugin = (initContext: PluginInitializerContext) =>
  new StackConnectorsPlugin(initContext);
