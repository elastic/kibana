/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSourceDefinition } from '@kbn/workchat-app/server';
import { CONNECTOR_DEFINITIONS } from '@kbn/search-connectors';

export function getConnectorDataSources(): DataSourceDefinition[] {
  // Filter for connectors that are supported for WorkChat
  const supportedConnectorTypes = new Set([
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
  ]);

  const connectors: DataSourceDefinition[] = CONNECTOR_DEFINITIONS.filter((connector) =>
    supportedConnectorTypes.has(connector.serviceType)
  ).map((connector) => ({
    type: connector.serviceType,
    category: 'index_based' as const,
    provider: 'connectors',
    name: connector.name,
    description: connector.description || `Search over your content with ${connector.name}.`,
    iconPath: connector.iconPath,
    tags: connector.keywords,
    // Add UI config for supported connectors
    uiConfig: {
      componentPath: `connectors/${connector.serviceType}`,
      componentProps: {
        connectorType: connector.serviceType,
        connectorName: connector.name,
      },
    },
  }));

  console.log(
    `getConnectorDataSources: Generated ${connectors.length} connector definitions from shared package`
  );
  connectors.forEach((connector, index) => {
    console.log(
      `  ${index + 1}. ${connector.name} (${connector.type}) - ${connector.category} - ${
        connector.tags?.length || 0
      } tags`
    );
  });

  return connectors;
}
