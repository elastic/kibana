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
import type { IntegrationImportComponent } from './components/integration_import/types';
import type { IntegrationImportCardButtonComponent } from './components/integration_import_card_button/types';
import type { RenderUpselling } from './services';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IntegrationImportPluginSetup {}

export interface IntegrationImportPluginStart {
  components: {
    /**
     * Component that allows the user to create an integration.
     */
    IntegrationImport: IntegrationImportComponent;
    /**
     * Component that links the user to the create integration component.
     */
    IntegrationImportCardButton: IntegrationImportCardButtonComponent;
  };
  /**
   * Sets the upselling to be rendered in the UI.
   * If defined, the section will be displayed and it will prevent
   * the user from interacting with the rest of the UI.
   */
  renderUpselling: (upselling: RenderUpselling | undefined) => void;
}

export interface IntegrationImportPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  licensing: LicensingPluginSetup;
}

export interface IntegrationImportPluginStartDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  licensing: LicensingPluginStart;
}
