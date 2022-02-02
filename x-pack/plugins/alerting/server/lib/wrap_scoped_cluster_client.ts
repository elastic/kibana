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
  abortController: AbortController;
}

export function wrapScopedClusterClient(opts: WrapScopedClusterClientOpts): IScopedClusterClient {
  const { scopedClusterClient, abortController } = opts;
  return {
    asInternalUser: wrapEsClient(scopedClusterClient.asInternalUser, abortController),
    asCurrentUser: wrapEsClient(scopedClusterClient.asCurrentUser, abortController),
  };
}

function wrapEsClient(
  esClient: ElasticsearchClient,
  abortController: AbortController
): ElasticsearchClient {
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
        return await esClient.search<TDocument, TAggregations, TContext>(query, {
          ...searchOptions,
          signal: abortController.signal,
        });
      } catch (e) {
        if (abortController.signal.aborted) {
          throw new Error('Search has been aborted due to cancelled execution');
        }
        throw e;
      }
    },
  };
}
