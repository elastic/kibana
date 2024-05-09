/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservabilityAIAssistantService } from '@kbn/observability-ai-assistant-plugin/public';
import type { ObservabilityAIAssistantAppPluginStartDependencies } from '../types';

export type ObservabilityAIAssistantAppService = ObservabilityAIAssistantService;

export function createAppService({
  pluginsStart,
}: {
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
}): ObservabilityAIAssistantAppService {
  return {
    ...pluginsStart.observabilityAIAssistant.service,
  };
}
