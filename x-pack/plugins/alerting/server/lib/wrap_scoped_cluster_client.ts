/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransportRequestOptions, TransportResult } from '@elastic/elasticsearch';
import type {
  SearchRequest,
  SearchResponse,
  AggregateName,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  SearchRequest as SearchRequestWithBody,
  AggregationsAggregate,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient, ElasticsearchClient } from 'src/core/server';

export interface WrapScopedClusterClientOpts {
  scopedClusterClient: IScopedClusterClient;
}

export function wrapScopedClusterClient(opts: WrapScopedClusterClientOpts): IScopedClusterClient {
  const { scopedClusterClient } = opts;
  return {
    asInternalUser: wrapEsClient(scopedClusterClient.asInternalUser),
    asCurrentUser: wrapEsClient(scopedClusterClient.asCurrentUser),
  };
}

function wrapEsClient(esClient: ElasticsearchClient): ElasticsearchClient {
  return {
    ...esClient,
    search: async <
      TDocument = unknown,
      TAggregations = Record<AggregateName, AggregationsAggregate>,
      TContext = unknown
    >(
      query?: SearchRequest | SearchRequestWithBody,
      options?: TransportRequestOptions
    ): Promise<TransportResult<SearchResponse<TDocument, TAggregations>, TContext>> => {
      try {
        const searchOptions = options ?? {};
        const result = await esClient.search<TDocument, TAggregations, TContext>(
          query,
          searchOptions
        );
        return result;
      } catch (e) {
        throw e;
      }
    },
  };
}
