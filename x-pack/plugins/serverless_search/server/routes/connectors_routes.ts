/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONNECTOR_DEFINITIONS, fetchConnectors } from '@kbn/search-connectors';
import { RouteDependencies } from '../plugin';

export const registerConnectorsRoutes = ({ http, router }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/serverless_search/connectors',
      validate: {},
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const connectors = await fetchConnectors(client.asCurrentUser);

      return response.ok({
        body: {
          connectors,
        },
        headers: { 'content-type': 'application/json' },
      });
    }
  );

  router.get(
    {
      path: '/internal/serverless_search/connector_types',
      validate: {},
    },
    async (context, request, response) => {
      const connectors = CONNECTOR_DEFINITIONS.map((connector) => ({
        ...connector,
        iconPath: connector.iconPath
          ? http.basePath.prepend(
              `/plugins/enterpriseSearch/assets/source_icons/${connector.iconPath}`
            )
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
