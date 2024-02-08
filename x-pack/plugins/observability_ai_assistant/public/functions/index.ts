/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
  RegisterRenderFunctionDefinition,
} from '../types';
import { registerLensRenderFunction } from './lens';
import { registerVisualizeQueryRenderFunction } from './visualize_esql';

export async function registerFunctions({
  registerRenderFunction,
  service,
  pluginsStart,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
  service: ObservabilityAIAssistantService;
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies;
}) {
  registerLensRenderFunction({ service, pluginsStart, registerRenderFunction });
  registerVisualizeQueryRenderFunction({ service, pluginsStart, registerRenderFunction });
}
