/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityQueryApiKeysRequest } from '@elastic/elasticsearch/lib/api/types';

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import type { ApiKey, ApiKeyAggregations, ApiKeyAggregationsResponse } from '../../../common/model';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

/**
 * Response of Kibana Query API keys endpoint.
 */
export interface QueryApiKeyResult {
  apiKeys: ApiKey[];
  canManageCrossClusterApiKeys: boolean;
  canManageApiKeys: boolean;
  canManageOwnApiKeys: boolean;
  count: number;
  total: number;
  aggregationTotal: number;
  aggregations: ApiKeyAggregations;
}

export function defineQueryApiKeysAndAggregationsRoute({
  router,
  getAuthenticationService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/api_key/_query',
      validate: {
        body: schema.object({
          query: schema.maybe(schema.object({}, { unknowns: 'allow' })),
          size: schema.maybe(schema.number()),
          sort: schema.maybe(schema.object({}, { unknowns: 'allow' })),
          from: schema.maybe(schema.number()),
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
        const { query, size, from, sort } = request.body as SecurityQueryApiKeysRequest;

        const queryResponse = await esClient.asCurrentUser.security.queryApiKeys({
          query,
          size,
          from,
          sort,
        });

        const transportResponse =
          await esClient.asCurrentUser.transport.request<ApiKeyAggregationsResponse>({
            method: 'POST',
            path: '/_security/_query/api_key',
            querystring: {
              filter_path: [
                'total',
                'aggregations.usernames.buckets.key',
                'aggregations.types.buckets.key',
                'aggregations.invalidated.doc_count',
                'aggregations.expired.doc_count',
                'aggregations.managed.buckets.metadataBased.doc_count',
                'aggregations.managed.buckets.namePrefixBased.doc_count',
              ],
            },
            body: {
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
                managed: {
                  filters: {
                    filters: {
                      metadataBased: { term: { 'metadata.managed': true } },
                      namePrefixBased: { prefix: { name: { value: 'Alerting' } } },
                    },
                  },
                },
              },
            },
          });

        return response.ok<QueryApiKeyResult>({
          body: {
            // @ts-expect-error Elasticsearch client types do not know about Cross-Cluster API keys yet.
            apiKeys: queryResponse.api_keys,
            total: queryResponse.total,
            count: queryResponse.api_keys.length,
            canManageCrossClusterApiKeys:
              clusterPrivileges.manage_security && areCrossClusterApiKeysEnabled,
            canManageApiKeys: clusterPrivileges.manage_api_key,
            canManageOwnApiKeys: clusterPrivileges.manage_own_api_key,
            aggregationTotal: transportResponse.total,
            aggregations: transportResponse.aggregations,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
