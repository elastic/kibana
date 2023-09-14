/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../plugin';

export const registerConnectorsRoutes = ({ router, search, security }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/serverless_search/connectors',
      validate: {},
    },
    async (context, request, response) => {
      const connectors = await search.connectorsService.getConnectors(request);

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
      const connectors = await search.connectorsService.getConnectorTypes();

      return response.ok({
        body: {
          connectors,
        },
        headers: { 'content-type': 'application/json' },
      });
    }
  );
};
