/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CreateIntegrationComponent } from './components/create_integration/types';
import type { CreateIntegrationCardButtonComponent } from './components/create_integration_card_button/types';
import type { RenderUpselling } from './services';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IntegrationAssistantPluginSetup {}

export interface IntegrationAssistantPluginStart {
  components: {
    /**
     * Component that allows the user to create an integration.
     */
    CreateIntegration: CreateIntegrationComponent;
    /**
     * Component that links the user to the create integration component.
     */
    CreateIntegrationCardButton: CreateIntegrationCardButtonComponent;
  };
  /**
   * Sets the upselling to be rendered in the UI.
   * If defined, the section will be displayed and it will prevent
   * the user from interacting with the rest of the UI.
   */
  renderUpselling: (upselling: RenderUpselling | undefined) => void;
}
