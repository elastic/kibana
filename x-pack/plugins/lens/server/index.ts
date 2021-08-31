/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from 'kibana/server';
import { LensServerPlugin } from './plugin';

export type { LensServerPluginSetup } from './plugin';
export * from './plugin';
export * from './migrations/types';

import { configSchema, ConfigSchema } from '../config';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
};

export const plugin = (initializerContext: PluginInitializerContext) =>
  new LensServerPlugin(initializerContext);
