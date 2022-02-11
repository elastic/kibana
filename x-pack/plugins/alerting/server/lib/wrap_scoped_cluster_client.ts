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
import { IScopedClusterClient, ElasticsearchClient, Logger } from 'src/core/server';
import { Alert as Rule } from '../types';

interface WrapScopedClusterClientOpts {
  scopedClusterClient: IScopedClusterClient;
  rule: Pick<Rule, 'name' | 'alertTypeId' | 'id'>;
  logger: Logger;
}

type WrapEsClientOpts = Omit<WrapScopedClusterClientOpts, 'scopedClusterClient'> & {
  esClient: ElasticsearchClient;
  logMetricsFn?: LogSearchMetricsFn;
};

interface LogSearchMetricsOpts {
  duration: number;
}
type LogSearchMetricsFn = (metrics: LogSearchMetricsOpts) => void;

export function createWrappedEsClientFactory(opts: WrapScopedClusterClientOpts) {
  let numQueries: number = 0;
  let totalDurationMs: number = 0;

  function logMetrics(metrics: LogSearchMetricsOpts) {
    numQueries++;
    totalDurationMs += metrics.duration;
  }

  return {
    client: () => wrapScopedClusterClient(opts, logMetrics),
    getStats: () => ({ totalDuration: totalDurationMs, numQueries }),
  };
}

export function wrapScopedClusterClient(
  opts: WrapScopedClusterClientOpts,
  logMetricsFn?: LogSearchMetricsFn
): IScopedClusterClient {
  const { scopedClusterClient, ...rest } = opts;
  return {
    asInternalUser: wrapEsClient({
      ...rest,
      esClient: scopedClusterClient.asInternalUser,
      logMetricsFn,
    }),
    asCurrentUser: wrapEsClient({
      ...rest,
      esClient: scopedClusterClient.asCurrentUser,
      logMetricsFn,
    }),
  };
}

function wrapEsClient(opts: WrapEsClientOpts): ElasticsearchClient {
  const { esClient, logger, rule, logMetricsFn } = opts;
  const wrappedClient: Record<string, unknown> = {};
  for (const attr in esClient) {
    if (!['search'].includes(attr)) {
      wrappedClient[attr] = esClient[attr as keyof ElasticsearchClient];
    }
  }

  wrappedClient.search = async <
    TDocument = unknown,
    TAggregations = Record<AggregateName, AggregationsAggregate>,
    TContext = unknown
  >(
    query?: SearchRequest | SearchRequestWithBody,
    options?: TransportRequestOptions
  ): Promise<TransportResult<SearchResponse<TDocument, TAggregations>, TContext>> => {
    try {
      const searchOptions = options ?? {};
      const start = Date.now();
      logger.debug(
        `executing query for rule ${rule.alertTypeId}:${rule.id} - ${JSON.stringify(query)}`
      );
      const result = await esClient.search<TDocument, TAggregations, TContext>(
        query,
        searchOptions
      );
      const end = Date.now();
      const durationMs = end - start;

      if (logMetricsFn) {
        logMetricsFn({ duration: durationMs });
      }
      return result;
    } catch (e) {
      throw e;
    }
  };

  return wrappedClient as ElasticsearchClient;
}
