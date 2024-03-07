/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export interface EsBucket {
  key: string;
  doc_count: number;
}
export interface ApiKeyAggregationResult {
  total: number;
  aggregations: {
    usernames: {
      doc_count_error_upper_bound: number;
      sum_other_doc_count: number;
      buckets: EsBucket[];
    };
    types: {
      doc_count_error_upper_bound: number;
      sum_other_doc_count: number;
      buckets: EsBucket[];
    };
    invalidated: {
      doc_count_error_upper_bound: number;
      sum_other_doc_count: number;
      buckets: EsBucket[];
    };
    expired: { doc_count: number };
    alertingKeys: { doc_count: number };
    managedMetadata: { doc_count: number };
  };
}

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
    createLicensedRouteHandler(async (context, _request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client;
        const authenticationService = getAuthenticationService();

        const areApiKeysEnabled = await authenticationService.apiKeys.areAPIKeysEnabled();

        if (!areApiKeysEnabled) {
          return response.notFound({
            body: {
              message:
                "API keys are disabled in Elasticsearch. To use API keys enable 'xpack.security.authc.api_key.enabled' setting.",
            },
          });
        }

        const transportResponse =
          await esClient.asCurrentUser.transport.request<ApiKeyAggregationResult>({
            method: 'POST',
            path: '/_security/_query/api_key',
            body: {
              size: 0,
              query: {
                bool: {
                  must: {
                    term: {
                      invalidated: false,
                    },
                  },
                },
              },
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
                alertingKeys: {
                  filter: {
                    prefix: {
                      name: {
                        value: 'Alerting',
                      },
                    },
                  },
                },
                managedMetadata: {
                  filter: {
                    term: {
                      'metadata.managed': true,
                    },
                  },
                },
              },
            },
          });

        return response.ok<ApiKeyAggregationResult>({
          body: {
            total: transportResponse.total,
            aggregations: transportResponse.aggregations,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
