/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract, PluginStartContract } from '@kbn/actions-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';

/* eslint-disable @typescript-eslint/no-empty-interface*/
export interface ObservabilityAIAssistantPluginStart {}
export interface ObservabilityAIAssistantPluginSetup {}
export interface ObservabilityAIAssistantPluginSetupDependencies {
  actions: PluginSetupContract;
  security: SecurityPluginSetup;
}
export interface ObservabilityAIAssistantPluginStartDependencies {
  actions: PluginStartContract;
  security: SecurityPluginStart;
}
