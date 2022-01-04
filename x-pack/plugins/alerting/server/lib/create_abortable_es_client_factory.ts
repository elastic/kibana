/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransportRequestOptions, TransportResult } from '@elastic/elasticsearch';
import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  SearchRequest as SearchRequestWithBody,
  AggregationsAggregate,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from 'src/core/server';

export interface IAbortableEsClient {
  search: <TDocument = unknown, TAggregations = Record<string, AggregationsAggregate>>(
    query: SearchRequest | SearchRequestWithBody,
    options?: TransportRequestOptions
  ) => Promise<TransportResult<SearchResponse<TDocument, TAggregations>, unknown>>;
}

export interface IAbortableClusterClient {
  readonly asInternalUser: IAbortableEsClient;
  readonly asCurrentUser: IAbortableEsClient;
}
export interface CreateAbortableEsClientFactoryOpts {
  scopedClusterClient: IScopedClusterClient;
  abortController: AbortController;
}

export function createAbortableEsClientFactory(opts: CreateAbortableEsClientFactoryOpts) {
  const { scopedClusterClient, abortController } = opts;
  return {
    asInternalUser: {
      search: async <TDocument = unknown, TAggregations = Record<string, AggregationsAggregate>>(
        query: SearchRequest | SearchRequestWithBody,
        options?: TransportRequestOptions
      ) => {
        try {
          const searchOptions = options ?? {};
          return await scopedClusterClient.asInternalUser.search<TDocument, TAggregations>(query, {
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
    },
    asCurrentUser: {
      search: async <TDocument = unknown, TAggregations = Record<string, AggregationsAggregate>>(
        query: SearchRequest | SearchRequestWithBody,
        options?: TransportRequestOptions
      ) => {
        try {
          const searchOptions = options ?? {};
          return await scopedClusterClient.asCurrentUser.search<TDocument, TAggregations>(query, {
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
    },
  };
}
