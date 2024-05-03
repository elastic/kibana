/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import type { QueryApiKeyResult } from '../../../common/model';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineQueryApiKeysAndAggregationsRoute({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.post(
    // SECURITY: We don't apply any authorization tags (e.g., access:security) to this route because all actions performed
    // on behalf of the user making the request and governed by the user's own cluster privileges.
    {
      path: '/internal/security/api_key/_query',
      validate: {
        body: schema.object({
          query: schema.maybe(schema.object({}, { unknowns: 'allow' })),
          from: schema.maybe(schema.number()),
          size: schema.maybe(schema.number()),
          sort: schema.maybe(
            schema.object({
              field: schema.string(),
              direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
            })
          ),
        }),
      },
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
              cluster: ['manage_security', 'read_security', 'manage_api_key', 'manage_own_api_key'],
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
        const { query, size, from, sort } = request.body;

        const transformedSort = sort && [{ [sort.field]: { order: sort.direction } }];
        let queryResult: Partial<QueryApiKeyResult>;
        try {
          const queryResponse = await esClient.asCurrentUser.security.queryApiKeys({
            query,
            sort: transformedSort,
            size,
            from,
          });

          queryResult = {
            // @ts-expect-error Elasticsearch client types do not know about Cross-Cluster API keys yet.
            apiKeys: queryResponse.api_keys,
            total: queryResponse.total,
            count: queryResponse.api_keys.length,
          };
        } catch ({ name, message }) {
          queryResult = { queryError: { name, message } };
        }

        const aggregationResponse = await esClient.asCurrentUser.security.queryApiKeys({
          filter_path: [
            'total',
            'aggregations.usernames.buckets.key',
            'aggregations.types.buckets.key',
            'aggregations.invalidated.doc_count',
            'aggregations.expired.doc_count',
            'aggregations.managed.buckets.metadataBased.doc_count',
            'aggregations.managed.buckets.namePrefixBased.doc_count',
          ],
          size: 0,
          query: { match: { invalidated: false } },
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
            expired: {
              filter: {
                range: { expiration: { lte: 'now' } },
              },
            },
            // We need this bucket to separately count API keys that were created by the Alerting plugin using only the plugin name
            // From v8.14.0, the Alerting plugin will create all keys with the `metadata.managed` field set to `true`
            managed: {
              filters: {
                filters: {
                  metadataBased: { term: { 'metadata.managed': true } },
                  namePrefixBased: { prefix: { name: { value: 'Alerting: ' } } },
                },
              },
            },
          },
        });

        return response.ok<QueryApiKeyResult>({
          // @ts-expect-error Elasticsearch client types do not know about Cross-Cluster API keys yet.
          body: {
            aggregationTotal: aggregationResponse.total,
            aggregations: aggregationResponse.aggregations,
            canManageCrossClusterApiKeys:
              clusterPrivileges.manage_security && areCrossClusterApiKeysEnabled,
            canManageApiKeys: clusterPrivileges.manage_api_key,
            canManageOwnApiKeys: clusterPrivileges.manage_own_api_key,
            ...queryResult,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
