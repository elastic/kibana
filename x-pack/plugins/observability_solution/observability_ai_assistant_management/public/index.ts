/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core-plugins-browser';
import { AiAssistantManagementObservabilityPlugin as AiAssistantManagementObservabilityPlugin } from './plugin';

export type {
  AiAssistantManagementObservabilityPluginSetup,
  AiAssistantManagementObservabilityPluginStart,
} from './plugin';

export function plugin(ctx: PluginInitializerContext) {
  return new AiAssistantManagementObservabilityPlugin(ctx);
}
