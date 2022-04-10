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
import { IScopedClusterClient, ElasticsearchClient, Logger } from 'src/core/server';
import { RuleExecutionMetrics } from '../types';
import { Rule } from '../types';

type RuleInfo = Pick<Rule, 'name' | 'alertTypeId' | 'id'> & { spaceId: string };
interface WrapScopedClusterClientFactoryOpts {
  scopedClusterClient: IScopedClusterClient;
  rule: RuleInfo;
  logger?: Logger;
  abortController: AbortController;
}

type WrapScopedClusterClientOpts = WrapScopedClusterClientFactoryOpts & {
  logMetricsFn: LogSearchMetricsFn;
  logRequestResponseFn: LogRequestResponseFn;
};

type WrapEsClientOpts = Omit<WrapScopedClusterClientOpts, 'scopedClusterClient'> & {
  esClient: ElasticsearchClient;
};

interface LogSearchMetricsOpts {
  esSearchDuration: number;
  totalSearchDuration: number;
}
type LogSearchMetricsFn = (metrics: LogSearchMetricsOpts) => void;
interface LogRequestResponseOpts {
  request?: SearchRequest | SearchRequestWithBody;
  response: SearchResponse;
}

type LogRequestResponseFn = (opts: LogRequestResponseOpts) => void;

export function createWrappedScopedClusterClientFactory(opts: WrapScopedClusterClientFactoryOpts) {
  let numSearches: number = 0;
  let esSearchDurationMs: number = 0;
  let totalSearchDurationMs: number = 0;

  const requests: Array<SearchRequest | SearchRequestWithBody> = [];
  const responses: SearchResponse[] = [];

  function logMetrics(metrics: LogSearchMetricsOpts) {
    numSearches++;
    esSearchDurationMs += metrics.esSearchDuration;
    totalSearchDurationMs += metrics.totalSearchDuration;
  }

  function logRequestAndResponse({ request, response }: LogRequestResponseOpts) {
    requests.push(request ?? {});
    responses.push(response);
  }

  const wrappedClient = wrapScopedClusterClient({
    ...opts,
    logMetricsFn: logMetrics,
    logRequestResponseFn: logRequestAndResponse,
  });

  return {
    client: () => wrappedClient,
    getMetrics: (): RuleExecutionMetrics => {
      return {
        esSearchDurationMs,
        totalSearchDurationMs,
        numSearches,
      };
    },
    getRequestAndResponse: () => {
      return {
        requests,
        responses,
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

  // Mutating the functions we want to wrap
  wrappedClient.search = getWrappedSearchFn({ esClient: wrappedClient, ...rest });

  return wrappedClient;
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
      if (opts.logger) {
        opts.logger.debug(
          `executing query for rule ${opts.rule.alertTypeId}:${opts.rule.id} in space ${
            opts.rule.spaceId
          } - ${JSON.stringify(params)} - with options ${JSON.stringify(searchOptions)}`
        );
      }

      const result = (await originalSearch.call(opts.esClient, params, {
        ...searchOptions,
        signal: opts.abortController.signal,
      })) as
        | TransportResult<SearchResponse<TDocument, TAggregations>, unknown>
        | SearchResponse<TDocument, TAggregations>;

      const end = Date.now();
      const durationMs = end - start;

      let took = 0;
      let resultBody;
      if (searchOptions.meta) {
        // when meta: true, response is TransportResult<SearchResponse<TDocument, TAggregations>, unknown>
        took = (result as TransportResult<SearchResponse<TDocument, TAggregations>, unknown>).body
          .took;
        resultBody = (result as TransportResult<SearchResponse<TDocument, TAggregations>, unknown>)
          .body;
      } else {
        // when meta: false, response is SearchResponse<TDocument, TAggregations>
        took = (result as SearchResponse<TDocument, TAggregations>).took;
        resultBody = result;
      }

      opts.logMetricsFn({ esSearchDuration: took ?? 0, totalSearchDuration: durationMs });
      opts.logRequestResponseFn({
        request: params,
        response: resultBody as unknown as SearchResponse,
      });
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
