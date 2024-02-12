/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';

import { configSchema, ConfigSchema } from '../config';

export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { GraphPlugin } = await import('./plugin');
  return new GraphPlugin(initializerContext);
};

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    canEditDrillDownUrls: true,
    savePolicy: true,
  },
  schema: configSchema,
};
