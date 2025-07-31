/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { WorkchatDataConnectorsPluginSetup, WorkchatDataConnectorsPluginStart } from './types';

export class WorkchatDataConnectorsPlugin
  implements Plugin<WorkchatDataConnectorsPluginSetup, WorkchatDataConnectorsPluginStart>
{
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): WorkchatDataConnectorsPluginSetup {
    // Return public API methods
    return {};
  }

  public start(core: CoreStart): WorkchatDataConnectorsPluginStart {
    // Register connector UI components
    this.registerConnectorComponents();

    return {};
  }

  private registerConnectorComponents() {
    // We'll import the registry and components dynamically to avoid circular dependencies
    import('@kbn/workchat-app/public').then(({ componentRegistry }) => {
      import('./components').then(({ ConnectorConfigPage }) => {
        // Register all supported connector types
        const supportedConnectorTypes = [
          'azure_blob_storage',
          'confluence',
          'jira',
          'sharepoint_online',
          'google_cloud_storage',
          'github',
          'google_drive',
          'slack',
          'dropbox',
          'servicenow',
        ];

        supportedConnectorTypes.forEach((connectorType) => {
          const componentPath = `connectors/${connectorType}`;
          console.log(`Registering connector UI component for: ${componentPath}`);

          componentRegistry.register(componentPath, {
            component: ConnectorConfigPage,
          });
        });
      });
    });
  }

  public stop() {}
}
