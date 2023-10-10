/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { HighCardinalityIndexerPlugin } from './plugin';
import type {
  HighCardinalityIndexerPluginSetup,
  HighCardinalityIndexerPluginStart,
  HighCardinalityIndexerPluginSetupDependencies,
  HighCardinalityIndexerPluginStartDependencies,
} from './types';

export const plugin: PluginInitializer<
  HighCardinalityIndexerPluginSetup,
  HighCardinalityIndexerPluginStart,
  HighCardinalityIndexerPluginSetupDependencies,
  HighCardinalityIndexerPluginStartDependencies
> = (pluginInitializerContext: PluginInitializerContext) =>
  new HighCardinalityIndexerPlugin(pluginInitializerContext);
