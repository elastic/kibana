/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  CONNECTOR_DEFINITIONS,
  createConnector,
  fetchConnectorById,
  fetchConnectors,
  updateConnectorNameAndDescription,
  updateConnectorServiceType,
} from '@kbn/search-connectors';
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
      path: '/internal/serverless_search/connector/{connectorId}',
      validate: {
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const result = await fetchConnectorById(client.asCurrentUser, request.params.connectorId);

      return result
        ? response.ok({
            body: {
              connector: result.value,
            },
            headers: { 'content-type': 'application/json' },
          })
        : response.notFound();
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

  router.post(
    {
      path: '/internal/serverless_search/connectors',
      validate: {},
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const connector = await createConnector(client.asCurrentUser, {
        indexName: null,
        instant_response: true,
        isNative: false,
        language: null,
      });

      return response.ok({
        body: {
          connector,
        },
        headers: { 'content-type': 'application/json' },
      });
    }
  );

  router.post(
    {
      path: '/internal/serverless_search/connectors/{connectorId}/name',
      validate: {
        body: schema.object({
          name: schema.string(),
        }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const result = await updateConnectorNameAndDescription(
        client.asCurrentUser,
        request.params.connectorId,
        {
          name: request.body.name,
        }
      );

      return response.ok({
        body: {
          result,
        },
        headers: { 'content-type': 'application/json' },
      });
    }
  );

  router.post(
    {
      path: '/internal/serverless_search/connectors/{connectorId}/description',
      validate: {
        body: schema.object({
          description: schema.string(),
        }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const result = await updateConnectorNameAndDescription(
        client.asCurrentUser,
        request.params.connectorId,
        {
          description: request.body.description,
        }
      );

      return response.ok({
        body: {
          result,
        },
        headers: { 'content-type': 'application/json' },
      });
    }
  );

  router.post(
    {
      path: '/internal/serverless_search/connectors/{connectorId}/service_type',
      validate: {
        body: schema.object({
          service_type: schema.string(),
        }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const result = await updateConnectorServiceType(
        client.asCurrentUser,
        request.params.connectorId,
        request.body.service_type
      );

      return response.ok({
        body: {
          result,
        },
        headers: { 'content-type': 'application/json' },
      });
    }
  );
};
