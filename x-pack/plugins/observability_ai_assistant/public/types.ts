/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ObservabilityAIAssistantPluginStart {}

export interface ObservabilityAIAssistantPluginSetup {}

export interface ObservabilityAIAssistantPluginSetupDependencies {
  triggersActions: TriggersAndActionsUIPublicPluginSetup;
}

export interface ObservabilityAIAssistantPluginStartDependencies {
  security: SecurityPluginStart;
  triggersActions: TriggersAndActionsUIPublicPluginStart;
}

export interface ConfigSchema {}
