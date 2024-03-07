/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { ObservabilityPlugin } from './plugin';
import type {
  ObservabilityPluginSetup,
  ObservabilityPluginStart,
  ObservabilityPluginSetupDependencies,
  ObservabilityPluginStartDependencies,
  ConfigSchema,
} from './types';

export type { ObservabilityPluginSetup, ObservabilityPluginStart };

export const plugin: PluginInitializer<
  ObservabilityPluginSetup,
  ObservabilityPluginStart,
  ObservabilityPluginSetupDependencies,
  ObservabilityPluginStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new ObservabilityPlugin(pluginInitializerContext);
