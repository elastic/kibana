/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { LlmTasksConfig } from './config';
import type {
  LlmTasksPluginSetup,
  LlmTasksPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from './types';
import { LlmTasksPlugin } from './plugin';

export { config } from './config';

export type { LlmTasksPluginSetup, LlmTasksPluginStart };

export const plugin: PluginInitializer<
  LlmTasksPluginSetup,
  LlmTasksPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<LlmTasksConfig>) =>
  new LlmTasksPlugin(pluginInitializerContext);
