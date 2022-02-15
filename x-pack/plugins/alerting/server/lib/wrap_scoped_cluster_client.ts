/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Client,
  TransportRequestOptions,
  TransportResult,
  TransportRequestOptionsWithMeta,
  TransportRequestOptionsWithOutMeta,
} from '@elastic/elasticsearch';
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

interface ElasticsearchClientWithChild extends ElasticsearchClient {
  child: Client['child'];
}

function wrapEsClient(
  esClient: ElasticsearchClient,
  abortController: AbortController
): ElasticsearchClient {
  // Core hides access to .child via TS
  const wrappedClient = (esClient as ElasticsearchClientWithChild).child({});

  // Wrap the functions we want to modify
  wrapSearchFn(wrappedClient, abortController);

  return wrappedClient;
}

function wrapSearchFn(esClient: ElasticsearchClient, abortController: AbortController) {
  const originalSearch = esClient.search;

  // A bunch of overloads to make TypeScript happy
  async function search<
    TDocument = unknown,
    TAggregations = Record<AggregateName, AggregationsAggregate>
  >(
    params?: SearchRequest | SearchRequestWithBody,
    options?: TransportRequestOptionsWithOutMeta
  ): Promise<SearchResponse<TDocument, TAggregations>>;
  async function search<
    TDocument = unknown,
    TAggregations = Record<AggregateName, AggregationsAggregate>
  >(
    params?: SearchRequest | SearchRequestWithBody,
    options?: TransportRequestOptionsWithMeta
  ): Promise<TransportResult<SearchResponse<TDocument, TAggregations>, unknown>>;
  async function search<
    TDocument = unknown,
    TAggregations = Record<AggregateName, AggregationsAggregate>
  >(
    params?: SearchRequest | SearchRequestWithBody,
    options?: TransportRequestOptions
  ): Promise<SearchResponse<TDocument, TAggregations>>;
  async function search<
    TDocument = unknown,
    TAggregations = Record<AggregateName, AggregationsAggregate>
  >(
    params?: SearchRequest | SearchRequestWithBody,
    options?: TransportRequestOptions
  ): Promise<
    | TransportResult<SearchResponse<TDocument, TAggregations>, unknown>
    | SearchResponse<TDocument, TAggregations>
  > {
    try {
      const searchOptions = options ?? {};
      return (await originalSearch.call(esClient, params, {
        ...searchOptions,
        signal: abortController.signal,
      })) as
        | TransportResult<SearchResponse<TDocument, TAggregations>, unknown>
        | SearchResponse<TDocument, TAggregations>;
    } catch (e) {
      if (abortController.signal.aborted) {
        throw new Error('Search has been aborted due to cancelled execution');
      }
      throw e;
    }
  }

  esClient.search = search;
}
