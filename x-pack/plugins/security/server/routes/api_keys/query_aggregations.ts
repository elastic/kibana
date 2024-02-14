/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineQueryApiKeysAggregationsRoute({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/api_key/_query_aggs',
      validate: false,
      options: {
        access: 'internal',
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client;
        const authenticationService = getAuthenticationService();

        const [{ cluster: clusterPrivileges }, areApiKeysEnabled, areCrossClusterApiKeysEnabled] =
          await Promise.all([
            esClient.asCurrentUser.security.hasPrivileges({
              body: {
                cluster: [
                  'manage_security',
                  'read_security',
                  'manage_api_key',
                  'manage_own_api_key',
                ],
              },
            }),
            authenticationService.apiKeys.areAPIKeysEnabled(),
            authenticationService.apiKeys.areCrossClusterAPIKeysEnabled(),
          ]);

        if (!areApiKeysEnabled) {
          return response.notFound({
            body: {
              message:
                "API keys are disabled in Elasticsearch. To use API keys enable 'xpack.security.authc.api_key.enabled' setting.",
            },
          });
        }

        const transportResponse = await esClient.asCurrentUser.transport.request({
          method: 'POST',
          path: '/_security/_query/api_key',
          body: {
            size: 0,
            aggs: {
              usernames: {
                terms: {
                  field: 'username',
                },
              },
              types: {
                terms: {
                  field: 'type',
                },
              },
              invalidated: {
                terms: {
                  field: 'invalidated',
                },
              },
              expired: {
                filter: {
                  range: { expiration: { lte: 'now/m' } },
                },
              },
            },
          },
        });

        return response.ok<any>({
          body: {
            // @ts-expect-error Elasticsearch client types do not know about Cross-Cluster API keys yet.
            aggregations: transportResponse.aggregations,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
