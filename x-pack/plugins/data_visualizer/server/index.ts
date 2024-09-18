/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from '../common/app';
import { configSchema } from './config_schema';

export const plugin = async (initializerContext: PluginInitializerContext<ConfigSchema>) => {
  const { DataVisualizerPlugin } = await import('./plugin');
  return new DataVisualizerPlugin(initializerContext);
};

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
  exposeToBrowser: {
    resultLinks: true,
  },
};
