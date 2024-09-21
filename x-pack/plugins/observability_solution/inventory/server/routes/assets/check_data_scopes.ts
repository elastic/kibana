/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { chunk, uniq } from 'lodash';
import objectHash from 'object-hash';
import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import pLimit from 'p-limit';
import { Logger } from '@kbn/logging';
import { excludeFrozenQuery } from '@kbn/observability-utils-common/es/queries/exclude_frozen_query';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';
import { kqlQuery } from '@kbn/observability-utils-common/es/queries/kql_query';

export interface DataScope {
  id: string;
  query: QueryDslQueryContainer;
  index: string[];
}

export interface DataScopeResult {
  has_data: boolean;
  scope: DataScope;
}

export function getDataScopeWithId(scope: Pick<DataScope, 'query' | 'index'>): DataScope {
  const index = uniq(scope.index.concat().sort());
  const nextScope = { index, query: scope.query };
  return {
    ...nextScope,
    id: objectHash(nextScope),
  };
}

export async function checkDataScopes({
  esClient,
  scopes,
  start,
  end,
  kuery,
  logger,
}: {
  esClient: ObservabilityElasticsearchClient;
  scopes: DataScope[];
  start: number;
  end: number;
  kuery: string;
  logger: Logger;
}): Promise<Map<string, DataScopeResult>> {
  const deduplicatedScopes = Array.from(new Map(scopes.map((scope) => [scope.id, scope])).values());

  const limiter = pLimit(5);

  logger.debug(`Running ${deduplicatedScopes.length} requests`);

  const scopeChunks = chunk(deduplicatedScopes, 50);

  const responses = await Promise.all(
    scopeChunks.map((scopesInChunk) => {
      return limiter(async () => {
        const searches = scopesInChunk.flatMap(({ query, index }) => {
          return [
            {
              index,
            },
            {
              terminate_after: 1,
              timeout: '1ms',
              track_total_hits: 1,
              size: 0,
              query: {
                bool: {
                  filter: [
                    query,
                    ...excludeFrozenQuery(),
                    ...rangeQuery(start, end),
                    ...kqlQuery(kuery),
                  ],
                },
              },
            },
          ];
        });

        const allResponses = await esClient.msearch('check_scopes_for_data', {
          searches,
        });

        return scopesInChunk.map((scope, index) => {
          const response = allResponses.responses[index];
          const total =
            typeof response.hits.total === 'number'
              ? response.hits.total
              : response.hits.total?.value ?? 0;

          return {
            scope,
            has_data: total > 0,
          };
        });
      });
    })
  );

  const resultsByScopeId = new Map(
    responses.flat().map((response) => [response.scope.id, response])
  );

  return resultsByScopeId;
}
