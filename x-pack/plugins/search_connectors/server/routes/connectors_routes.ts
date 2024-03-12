/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONNECTOR_DEFINITIONS } from '@kbn/search-connectors';
import { RouteDependencies } from '../plugin';

export const registerConnectorsRoutes = ({ http, router }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/search_connectors/connector_types',
      validate: {},
    },
    async (context, request, response) => {
      const connectors = CONNECTOR_DEFINITIONS.map((connector) => ({
        ...connector,
        iconPath: connector.iconPath
          ? `${http.staticAssets.getPluginAssetHref(connector.iconPath)}`
          : 'logoEnterpriseSearch',
      }));

      return response.ok({
        body: {
          connectors,
        },
        headers: { 'content-type': 'application/json' },
      });
    }
  );
};
