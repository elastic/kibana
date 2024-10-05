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
import type { EntitiesAppConfig } from './config';
import { EntitiesAppPlugin } from './plugin';
import type {
  EntitiesAppServerSetup,
  EntitiesAppServerStart,
  EntitiesAppSetupDependencies,
  EntitiesAppStartDependencies,
} from './types';

export type { EntitiesAppServerSetup, EntitiesAppServerStart };

import { config as configSchema } from './config';

export const config: PluginConfigDescriptor<EntitiesAppConfig> = {
  schema: configSchema,
};

export const plugin: PluginInitializer<
  EntitiesAppServerSetup,
  EntitiesAppServerStart,
  EntitiesAppSetupDependencies,
  EntitiesAppStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<EntitiesAppConfig>) =>
  new EntitiesAppPlugin(pluginInitializerContext);
