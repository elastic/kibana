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

  // Mutating the functions we want to wrap
  wrappedClient.transport.request = getWrappedTransportRequestFn({
    esClient: wrappedClient,
    ...rest,
  });

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
