/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract, PluginStartContract } from '@kbn/actions-plugin/server';

/* eslint-disable @typescript-eslint/no-empty-interface*/
export interface ObservabilityAIAssistantPluginStart {}
export interface ObservabilityAIAssistantPluginSetup {}
export interface ObservabilityAIAssistantPluginSetupDependencies {
  actions: PluginSetupContract;
}
export interface ObservabilityAIAssistantPluginStartDependencies {
  actions: PluginStartContract;
}
