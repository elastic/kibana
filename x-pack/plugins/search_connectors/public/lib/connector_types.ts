/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core-http-browser';
import { ConnectorServerSideDefinition, CONNECTOR_DEFINITIONS } from '@kbn/search-connectors';

export function getConnectorTypes(http: HttpStart): ConnectorServerSideDefinition[] {
  return CONNECTOR_DEFINITIONS.map((connector) => ({
    ...connector,
    iconPath: connector.iconPath
      ? http.staticAssets.getPluginAssetHref(`icons/${connector.iconPath}`)
      : 'logoEnterpriseSearch',
  }));
}
