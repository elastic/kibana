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
  EqlSearchRequest,
  EqlSearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  SearchRequest as SearchRequestWithBody,
  AggregationsAggregate,
  EqlSearchRequest as EqlSearchRequestWithBody,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IScopedClusterClient, ElasticsearchClient, Logger } from '@kbn/core/server';
import { SearchMetrics, RuleInfo } from './types';

interface WrapScopedClusterClientFactoryOpts {
  scopedClusterClient: IScopedClusterClient;
  rule: RuleInfo;
  logger: Logger;
  abortController: AbortController;
  requestTimeout?: number;
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

export interface WrappedScopedClusterClient {
  client: () => IScopedClusterClient;
  getMetrics: () => SearchMetrics;
}

export function createWrappedScopedClusterClientFactory(
  opts: WrapScopedClusterClientFactoryOpts
): WrappedScopedClusterClient {
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

class WrappedScopedClusterClientImpl implements IScopedClusterClient {
  #asInternalUser?: ElasticsearchClient;
  #asCurrentUser?: ElasticsearchClient;
  #asSecondaryAuthUser?: ElasticsearchClient;

  constructor(private readonly opts: WrapScopedClusterClientOpts) {}

  public get asInternalUser() {
    if (this.#asInternalUser === undefined) {
      const { scopedClusterClient, ...rest } = this.opts;
      this.#asInternalUser = wrapEsClient({
        ...rest,
        esClient: scopedClusterClient.asInternalUser,
      });
    }
    return this.#asInternalUser;
  }
  public get asCurrentUser() {
    if (this.#asCurrentUser === undefined) {
      const { scopedClusterClient, ...rest } = this.opts;
      this.#asCurrentUser = wrapEsClient({
        ...rest,
        esClient: scopedClusterClient.asCurrentUser,
      });
    }
    return this.#asCurrentUser;
  }
  public get asSecondaryAuthUser() {
    if (this.#asSecondaryAuthUser === undefined) {
      const { scopedClusterClient, ...rest } = this.opts;
      this.#asSecondaryAuthUser = wrapEsClient({
        ...rest,
        esClient: scopedClusterClient.asSecondaryAuthUser,
      });
    }
    return this.#asSecondaryAuthUser;
  }
}

function wrapScopedClusterClient(opts: WrapScopedClusterClientOpts): IScopedClusterClient {
  return new WrappedScopedClusterClientImpl(opts);
}

function wrapEsClient(opts: WrapEsClientOpts): ElasticsearchClient {
  const { esClient, ...rest } = opts;

  const wrappedClient = esClient.child({});

  // Mutating the functions we want to wrap
  wrappedClient.transport.request = getWrappedTransportRequestFn({
    esClient: wrappedClient,
    ...rest,
  });
  wrappedClient.search = getWrappedSearchFn({ esClient: wrappedClient, ...rest });
  wrappedClient.eql.search = getWrappedEqlSearchFn({ esClient: wrappedClient, ...rest });

  return wrappedClient;
}

function getWrappedTransportRequestFn(opts: WrapEsClientOpts) {
  const originalRequestFn = opts.esClient.transport.request;
  const requestTimeout = opts.requestTimeout;

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
  ): Promise<TResponse>;
  async function request<TResponse = unknown, TContext = unknown>(
    params: TransportRequestParams,
    options?: TransportRequestOptions
  ): Promise<TResponse | TransportResult<TResponse, TContext>> {
    // Wrap ES|QL requests with an abort signal
    if (params.method === 'POST' && params.path === '/_query') {
      try {
        const requestOptions = options ?? {};
        const start = Date.now();
        opts.logger.debug(
          () =>
            `executing ES|QL query for rule ${opts.rule.alertTypeId}:${opts.rule.id} in space ${
              opts.rule.spaceId
            } - ${JSON.stringify(params)} - with options ${JSON.stringify(requestOptions)}${
              requestTimeout ? ` and ${requestTimeout}ms requestTimeout` : ''
            }`
        );
        const result = (await originalRequestFn.call(opts.esClient.transport, params, {
          ...requestOptions,
          ...(requestTimeout
            ? {
                requestTimeout,
              }
            : {}),
          signal: opts.abortController.signal,
        })) as Promise<TResponse> | TransportResult<TResponse, TContext>;

        const end = Date.now();
        const durationMs = end - start;

        opts.logMetricsFn({ esSearchDuration: 0, totalSearchDuration: durationMs });
        return result;
      } catch (e) {
        if (opts.abortController.signal.aborted) {
          throw new Error('ES|QL search has been aborted due to cancelled execution');
        }
        throw e;
      }
    }

    // No wrap
    return (await originalRequestFn.call(opts.esClient.transport, params, {
      ...options,
      ...(requestTimeout
        ? {
            requestTimeout,
          }
        : {}),
    })) as Promise<TResponse>;
  }

  return request;
}

function getWrappedEqlSearchFn(opts: WrapEsClientOpts) {
  const originalEqlSearch = opts.esClient.eql.search;
  const requestTimeout = opts.requestTimeout;

  // A bunch of overloads to make TypeScript happy
  async function search<TEvent = unknown>(
    params: EqlSearchRequest | EqlSearchRequestWithBody,
    options?: TransportRequestOptionsWithOutMeta
  ): Promise<EqlSearchResponse<TEvent>>;
  async function search<TEvent = unknown>(
    params: EqlSearchRequest | EqlSearchRequestWithBody,
    options?: TransportRequestOptionsWithMeta
  ): Promise<TransportResult<EqlSearchResponse<TEvent>, unknown>>;
  async function search<TEvent = unknown>(
    params: EqlSearchRequest | EqlSearchRequestWithBody,
    options?: TransportRequestOptions
  ): Promise<EqlSearchResponse<TEvent>>;
  async function search<TEvent = unknown>(
    params: EqlSearchRequest | EqlSearchRequestWithBody,
    options?: TransportRequestOptions
  ): Promise<EqlSearchResponse<TEvent> | TransportResult<EqlSearchResponse<TEvent>, unknown>> {
    try {
      const searchOptions = options ?? {};
      const start = Date.now();
      opts.logger.debug(
        () =>
          `executing eql query for rule ${opts.rule.alertTypeId}:${opts.rule.id} in space ${
            opts.rule.spaceId
          } - ${JSON.stringify(params)} - with options ${JSON.stringify(searchOptions)}${
            requestTimeout ? ` and ${requestTimeout}ms requestTimeout` : ''
          }`
      );
      const result = (await originalEqlSearch.call(opts.esClient, params, {
        ...searchOptions,
        ...(requestTimeout
          ? {
              requestTimeout,
            }
          : {}),
        signal: opts.abortController.signal,
      })) as TransportResult<EqlSearchResponse<TEvent>, unknown> | EqlSearchResponse<TEvent>;

      const end = Date.now();
      const durationMs = end - start;

      let took: number | undefined = 0;
      if (searchOptions.meta) {
        // when meta: true, response is TransportResult<EqlSearchResponse<TEvent>, unknown>
        took = (result as TransportResult<EqlSearchResponse<TEvent>, unknown>).body.took;
      } else {
        // when meta: false, response is EqlSearchResponse<TEvent>
        took = (result as EqlSearchResponse<TEvent>).took;
      }

      opts.logMetricsFn({ esSearchDuration: took ?? 0, totalSearchDuration: durationMs });
      return result;
    } catch (e) {
      if (opts.abortController.signal.aborted) {
        throw new Error('EQL search has been aborted due to cancelled execution');
      }
      throw e;
    }
  }

  return search;
}

function getWrappedSearchFn(opts: WrapEsClientOpts) {
  const originalSearch = opts.esClient.search;
  const requestTimeout = opts.requestTimeout;

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
        () =>
          `executing query for rule ${opts.rule.alertTypeId}:${opts.rule.id} in space ${
            opts.rule.spaceId
          } - ${JSON.stringify(params)} - with options ${JSON.stringify(searchOptions)}${
            requestTimeout ? ` and ${requestTimeout}ms requestTimeout` : ''
          }`
      );
      const result = (await originalSearch.call(opts.esClient, params, {
        ...searchOptions,
        ...(requestTimeout
          ? {
              requestTimeout,
            }
          : {}),
        signal: opts.abortController.signal,
      })) as
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
