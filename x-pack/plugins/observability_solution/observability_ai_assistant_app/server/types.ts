/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ObservabilityAIAssistantServerSetup,
  ObservabilityAIAssistantServerStart,
} from '@kbn/observability-ai-assistant-plugin/server';
import type {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityAIAssistantAppServerStart {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityAIAssistantAppServerSetup {}

export interface ObservabilityAIAssistantAppPluginStartDependencies {
  observabilityAIAssistant: ObservabilityAIAssistantServerStart;
  ruleRegistry: RuleRegistryPluginStartContract;
}

export interface ObservabilityAIAssistantAppPluginSetupDependencies {
  observabilityAIAssistant: ObservabilityAIAssistantServerSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
}
