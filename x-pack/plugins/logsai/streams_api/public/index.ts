/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import { EntitiesAPIPlugin } from './plugin';
import type {
  EntitiesAPIPublicSetup,
  EntitiesAPIPublicStart,
  EntitiesAPISetupDependencies,
  EntitiesAPIStartDependencies,
  ConfigSchema,
} from './types';

export type { EntitiesAPIPublicSetup, EntitiesAPIPublicStart };

export const plugin: PluginInitializer<
  EntitiesAPIPublicSetup,
  EntitiesAPIPublicStart,
  EntitiesAPISetupDependencies,
  EntitiesAPIStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new EntitiesAPIPlugin(pluginInitializerContext);

export { getIndexPatternsForFilters, entitySourceQuery } from '../common';

export type { Entity } from '../common';
