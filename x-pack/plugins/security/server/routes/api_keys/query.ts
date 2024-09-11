/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { QueryApiKeyResult } from '@kbn/security-plugin-types-common';

import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

interface QueryClause {
  [key: string]: any;
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
          filters: schema.maybe(
            schema.object({
              usernames: schema.maybe(schema.arrayOf(schema.string())),
              type: schema.maybe(
                schema.oneOf([
                  schema.literal('rest'),
                  schema.literal('cross_cluster'),
                  schema.literal('managed'),
                ])
              ),
              expired: schema.maybe(schema.boolean()),
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

        const alertingPrefixFilter = { prefix: { name: { value: 'Alerting: ' } } };
        const managedMetadataFilter = { term: { 'metadata.managed': true } };

        const { query, size, from, sort, filters } = request.body;

        const queryPayload: {
          bool: { must: QueryClause[]; should: QueryClause[]; must_not: QueryClause[] };
        } = { bool: { must: [], should: [], must_not: [] } };

        if (query) {
          queryPayload.bool.must.push(query);
        }
        queryPayload.bool.must.push({ term: { invalidated: false } });

        if (filters) {
          const { usernames, type, expired } = filters;

          if (type === 'managed') {
            queryPayload.bool.must.push({
              bool: {
                should: [alertingPrefixFilter, managedMetadataFilter],
              },
            });
          } else if (type === 'rest' || type === 'cross_cluster') {
            queryPayload.bool.must.push({ term: { type } });
            queryPayload.bool.must_not.push(alertingPrefixFilter, managedMetadataFilter);
          }

          if (expired === false) {
            // Active API keys are those that have an expiration date in the future or no expiration date at all
            const activeKeysDsl = {
              bool: {
                must: [
                  {
                    bool: {
                      should: [
                        {
                          range: {
                            expiration: {
                              gt: 'now',
                            },
                          },
                        },
                        {
                          bool: {
                            must_not: {
                              exists: {
                                field: 'expiration',
                              },
                            },
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            };
            queryPayload.bool.must.push(activeKeysDsl);
          } else if (expired === true) {
            queryPayload.bool.must.push({ range: { expiration: { lte: 'now' } } });
          }

          if (usernames && usernames.length > 0) {
            queryPayload.bool.must.push({ terms: { username: usernames } });
          }
        }

        const transformedSort = sort && [{ [sort.field]: { order: sort.direction } }];
        let queryResult: Partial<QueryApiKeyResult>;
        try {
          const queryResponse = await esClient.asCurrentUser.security.queryApiKeys({
            query: queryPayload,
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
                  metadataBased: managedMetadataFilter,
                  namePrefixBased: alertingPrefixFilter,
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
