/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { ObservabilityAIAssistantConfig } from './config';
import { ObservabilityAIAssistantPlugin } from './plugin';

export type { ObservabilityAIAssistantServerRouteRepository } from './routes/get_global_observability_ai_assistant_route_repository';

import { config as configSchema } from './config';

export const config: PluginConfigDescriptor<ObservabilityAIAssistantConfig> = {
  exposeToBrowser: {},
  schema: configSchema,
};

export const plugin = (ctx: PluginInitializerContext<ObservabilityAIAssistantConfig>) =>
  new ObservabilityAIAssistantPlugin(ctx);
