/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityQueryApiKeysAPIKeyAggregate } from '@elastic/elasticsearch/lib/api/types';

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import type { ApiKey } from '../../../common/model';
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
  aggregations: Record<string, SecurityQueryApiKeysAPIKeyAggregate> | undefined;
  queryError?: Error;
}

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
        const responseBody: QueryApiKeyResult = {} as QueryApiKeyResult;
        try {
          const queryResponse = await esClient.asCurrentUser.security.queryApiKeys({
            query,
            sort: transformedSort,
            size,
            from,
          });
          // @ts-expect-error Elasticsearch client types do not know about Cross-Cluster API keys yet.
          responseBody.apiKeys = queryResponse.api_keys;
          responseBody.total = queryResponse.total;
          responseBody.count = queryResponse.api_keys.length;
        } catch ({ name, message }) {
          responseBody.queryError = {
            name,
            message,
          };
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
        responseBody.aggregationTotal = aggregationResponse.total;
        responseBody.aggregations = aggregationResponse.aggregations;
        responseBody.canManageCrossClusterApiKeys =
          clusterPrivileges.manage_security && areCrossClusterApiKeysEnabled;
        responseBody.canManageApiKeys = clusterPrivileges.manage_api_key;
        responseBody.canManageOwnApiKeys = clusterPrivileges.manage_own_api_key;

        return response.ok<QueryApiKeyResult>({
          body: responseBody,
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
