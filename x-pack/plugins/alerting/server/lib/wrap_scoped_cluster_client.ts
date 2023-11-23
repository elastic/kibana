/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TransportRequestOptions,
  TransportResult,
  TransportRequestOptionsWithMeta,
  TransportRequestOptionsWithOutMeta,
  TransportRequestParams,
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
import type { IScopedClusterClient, ElasticsearchClient, Logger } from '@kbn/core/server';
import { SearchMetrics, RuleInfo } from './types';

interface WrapScopedClusterClientFactoryOpts {
  scopedClusterClient: IScopedClusterClient;
  rule: RuleInfo;
  logger: Logger;
  abortController: AbortController;
}

type WrapScopedClusterClientOpts = WrapScopedClusterClientFactoryOpts & {
  logMetricsFn: LogSearchMetricsFn;
};

type WrapEsClientOpts = Omit<WrapScopedClusterClientOpts, 'scopedClusterClient'> & {
  esClient: ElasticsearchClient;
};

interface LogSearchMetricsOpts {
  esSearchDuration: number;
  totalSearchDuration: number;
}
type LogSearchMetricsFn = (metrics: LogSearchMetricsOpts) => void;

export function createWrappedScopedClusterClientFactory(opts: WrapScopedClusterClientFactoryOpts) {
  let numSearches: number = 0;
  let esSearchDurationMs: number = 0;
  let totalSearchDurationMs: number = 0;

  function logMetrics(metrics: LogSearchMetricsOpts) {
    numSearches++;
    esSearchDurationMs += metrics.esSearchDuration;
    totalSearchDurationMs += metrics.totalSearchDuration;
  }

  const wrappedClient = wrapScopedClusterClient({ ...opts, logMetricsFn: logMetrics });

  return {
    client: () => wrappedClient,
    getMetrics: (): SearchMetrics => {
      return {
        esSearchDurationMs,
        totalSearchDurationMs,
        numSearches,
      };
    },
  };
}

function wrapScopedClusterClient(opts: WrapScopedClusterClientOpts): IScopedClusterClient {
  const { scopedClusterClient, ...rest } = opts;
  return {
    asInternalUser: wrapEsClient({
      ...rest,
      esClient: scopedClusterClient.asInternalUser,
    }),
    asCurrentUser: wrapEsClient({
      ...rest,
      esClient: scopedClusterClient.asCurrentUser,
    }),
  };
}

function wrapEsClient(opts: WrapEsClientOpts): ElasticsearchClient {
  const { esClient, ...rest } = opts;

  const wrappedClient = esClient.child({});

  // Mutating the request function so we can cancel all ongoing requests
  wrappedClient.transport.request = getWrappedTransportRequestFn({
    esClient: wrappedClient,
    ...rest,
  });

  // Mutating the functions we want to wrap
  wrappedClient.search = getWrappedSearchFn({ esClient: wrappedClient, ...rest });

  return wrappedClient;
}

function getWrappedTransportRequestFn(opts: WrapEsClientOpts) {
  const originalRequestFn = opts.esClient.transport.request;

  // A bunch of overloads to make TypeScript happy
  async function request<TResponse = unknown>(
    params: TransportRequestParams,
    options?: TransportRequestOptionsWithOutMeta
  ): Promise<TResponse>;
  async function request<TResponse = unknown, TContext = unknown>(
    params: TransportRequestParams,
    options?: TransportRequestOptionsWithMeta
  ): Promise<TransportResult<TResponse, TContext>>;
  async function request<TResponse = unknown>(
    params: TransportRequestParams,
    options?: TransportRequestOptions
  ): Promise<TResponse> {
    const requestOptions = options ?? {};
    return (await originalRequestFn.call(opts.esClient.transport, params, {
      ...requestOptions,
      signal: opts.abortController.signal,
    })) as Promise<TResponse>;
  }

  return request;
}

function getWrappedSearchFn(opts: WrapEsClientOpts) {
  const originalSearch = opts.esClient.search;

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
      const start = Date.now();
      opts.logger.debug(
        `executing query for rule ${opts.rule.alertTypeId}:${opts.rule.id} in space ${
          opts.rule.spaceId
        } - ${JSON.stringify(params)} - with options ${JSON.stringify(searchOptions)}`
      );
      // No need to pass "signal" because the lower level request function is already wrapped to do so
      const result = (await originalSearch.call(opts.esClient, params, searchOptions)) as
        | TransportResult<SearchResponse<TDocument, TAggregations>, unknown>
        | SearchResponse<TDocument, TAggregations>;

      const end = Date.now();
      const durationMs = end - start;

      let took = 0;
      if (searchOptions.meta) {
        // when meta: true, response is TransportResult<SearchResponse<TDocument, TAggregations>, unknown>
        took = (result as TransportResult<SearchResponse<TDocument, TAggregations>, unknown>).body
          .took;
      } else {
        // when meta: false, response is SearchResponse<TDocument, TAggregations>
        took = (result as SearchResponse<TDocument, TAggregations>).took;
      }

      opts.logMetricsFn({ esSearchDuration: took ?? 0, totalSearchDuration: durationMs });
      return result;
    } catch (e) {
      if (opts.abortController.signal.aborted) {
        throw new Error('Search has been aborted due to cancelled execution');
      }
      throw e;
    }
  }

  return search;
}
