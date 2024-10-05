/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { EntitiesAPIConfig } from './config';
import type {
  EntitiesAPIServerStart,
  EntitiesAPIServerSetup,
  EntitiesAPISetupDependencies,
  EntitiesAPIStartDependencies,
} from './types';

export type { EntitiesAPIServerRouteRepository } from './routes/get_global_entities_api_route_repository';

export type { EntitiesAPIServerSetup, EntitiesAPIServerStart };

import { config as configSchema } from './config';
import { EntitiesAPIPlugin } from './plugin';

export const config: PluginConfigDescriptor<EntitiesAPIConfig> = {
  schema: configSchema,
};

export const plugin: PluginInitializer<
  EntitiesAPIServerSetup,
  EntitiesAPIServerStart,
  EntitiesAPISetupDependencies,
  EntitiesAPIStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<EntitiesAPIConfig>) =>
  new EntitiesAPIPlugin(pluginInitializerContext);
