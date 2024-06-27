/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { CreateIntegrationComponent } from './components/create_integration/types';
import type { CreateIntegrationCardButtonComponent } from './components/create_integration_card_button/types';
import type { UpsellingPage } from './services';

export interface IntegrationAssistantPluginSetup {
  renderUpsellingComponent: (UpsellingPage: UpsellingPage) => void;
}

export interface IntegrationAssistantPluginStart {
  CreateIntegration: CreateIntegrationComponent;
  CreateIntegrationCardButton: CreateIntegrationCardButtonComponent;
}

export interface IntegrationAssistantPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  licensing: LicensingPluginSetup;
}

export interface IntegrationAssistantPluginStartDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  licensing: LicensingPluginStart;
}
