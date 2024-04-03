/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IStaticAssets } from '@kbn/core-http-browser';
import { ConnectorServerSideDefinition, CONNECTOR_DEFINITIONS } from '../connectors';
import { CONNECTORS_DICT } from '../constants';
import { ConnectorDefinition } from '../types';

// used on server and in browser before plugin start when we don't have docLinks yet
export function getConnectorTypes(staticAssets: IStaticAssets): ConnectorServerSideDefinition[] {
  return CONNECTOR_DEFINITIONS.map((connector) => ({
    ...connector,
    iconPath: connector.iconPath
      ? staticAssets.getPluginAssetHref(`icons/${connector.iconPath}`)
      : 'logoEnterpriseSearch',
  }));
}

// used in browser after pluginStart, when docLinks has been populated
export function getConnectorFullTypes(staticAssets: IStaticAssets): ConnectorDefinition[] {
  const CONNECTORS = CONNECTOR_DEFINITIONS.map((connector) => ({
    ...connector,
    ...(connector.serviceType && CONNECTORS_DICT[connector.serviceType]
      ? CONNECTORS_DICT[connector.serviceType]
      : CONNECTORS_DICT.custom),
  }));
  return CONNECTORS.map((connector) => ({
    ...connector,
    iconPath: connector.iconPath
      ? staticAssets.getPluginAssetHref(`icons/${connector.iconPath}`)
      : 'logoEnterpriseSearch',
  }));
}
