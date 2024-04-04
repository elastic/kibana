/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { ConfigSchema, ObservabilityAIAssistantAppPlugin } from './plugin';
import type {
  ObservabilityAIAssistantAppPluginSetupDependencies,
  ObservabilityAIAssistantAppPluginStartDependencies,
  ObservabilityAIAssistantAppPublicSetup,
  ObservabilityAIAssistantAppPublicStart,
} from './types';

export const plugin: PluginInitializer<
  ObservabilityAIAssistantAppPublicSetup,
  ObservabilityAIAssistantAppPublicStart,
  ObservabilityAIAssistantAppPluginSetupDependencies,
  ObservabilityAIAssistantAppPluginStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new ObservabilityAIAssistantAppPlugin(pluginInitializerContext);
