/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core-plugins-server';
import { ApiScraperConfig } from '../common/config';
import { ApiScraperServerPluginSetup, ApiScraperServerPluginStart, config } from './plugin';
import { ApiScraperRouteRepository } from './routes';

export type {
  ApiScraperConfig,
  ApiScraperServerPluginSetup as EntityManagerServerPluginSetup,
  ApiScraperServerPluginStart as EntityManagerServerPluginStart,
  ApiScraperRouteRepository as EntityManagerRouteRepository,
};
export { config };

export const plugin = async (context: PluginInitializerContext<ApiScraperConfig>) => {
  const { ApiScraperServerPlugin } = await import('./plugin');
  return new ApiScraperServerPlugin(context);
};
