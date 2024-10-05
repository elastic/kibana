/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import { EntitiesAppPlugin } from './plugin';
import type {
  EntitiesAppPublicSetup,
  EntitiesAppPublicStart,
  EntitiesAppSetupDependencies,
  EntitiesAppStartDependencies,
  ConfigSchema,
} from './types';

export type { EntitiesAppPublicSetup, EntitiesAppPublicStart };

export const plugin: PluginInitializer<
  EntitiesAppPublicSetup,
  EntitiesAppPublicStart,
  EntitiesAppSetupDependencies,
  EntitiesAppStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new EntitiesAppPlugin(pluginInitializerContext);
