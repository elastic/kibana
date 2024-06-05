/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { IntegrationAssistantComponent } from './components/integration_assistant/types';
import type { CreateIntegrationCardButtonComponent } from './components/create_integration_card_button/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IntegrationAssistantPluginSetup {}

export interface IntegrationAssistantPluginStart {
  IntegrationAssistant: IntegrationAssistantComponent;
  CreateIntegrationCardButton: CreateIntegrationCardButtonComponent;
}

export interface IntegrationAssistantPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  spaces: SpacesPluginSetup;
}

export interface IntegrationAssistantPluginStartDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  spaces: SpacesPluginStart;
}

export type IntegrationAssistantServices = CoreStart & IntegrationAssistantPluginStartDependencies;
