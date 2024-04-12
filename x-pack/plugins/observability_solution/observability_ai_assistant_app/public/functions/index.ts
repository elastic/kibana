/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterRenderFunctionDefinition } from '@kbn/observability-ai-assistant-plugin/public/types';
import type { ObservabilityAIAssistantAppPluginStartDependencies } from '../types';
import { registerLensRenderFunction } from './lens';
import { registerVisualizeQueryRenderFunction } from './visualize_esql';

export async function registerFunctions({
  registerRenderFunction,
  pluginsStart,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
}) {
  registerLensRenderFunction({ pluginsStart, registerRenderFunction });
  registerVisualizeQueryRenderFunction({ pluginsStart, registerRenderFunction });
}
