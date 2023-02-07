/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { KibanaRequest } from '@kbn/core/server';
import { unwrapEsResponse } from '@kbn/observability-plugin/server';
import { MgetRequest, MgetResponse } from '@elastic/elasticsearch/lib/api/types';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ProfilingESEvent } from '../../common/elasticsearch';
import { withProfilingSpan } from './with_profiling_span';
import { StackTraceResponse } from '../../common/stack_traces';

export function cancelEsRequestOnAbort<T extends Promise<any>>(
  promise: T,
  request: KibanaRequest,
  controller: AbortController
): T {
  const subscription = request.events.aborted$.subscribe(() => {
    controller.abort();
  });

  return promise.finally(() => subscription.unsubscribe()) as T;
}

export interface ProfilingESClient {
  search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
    operationName: string,
    searchRequest: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>>;
  mget<TDocument = ProfilingESEvent>(
    operationName: string,
    mgetRequest: MgetRequest
  ): Promise<MgetResponse<TDocument>>;
  profilingStacktraces({}: {
    query: QueryDslQueryContainer;
    sampleSize: number;
  }): Promise<StackTraceResponse>;
  getEsClient(): ElasticsearchClient;
}

export function createProfilingEsClient({
  request,
  esClient,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
}): ProfilingESClient {
  return {
    search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
      operationName: string,
      searchRequest: TSearchRequest
    ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
      const controller = new AbortController();

      const promise = withProfilingSpan(operationName, () => {
        return cancelEsRequestOnAbort(
          esClient.search(searchRequest, {
            signal: controller.signal,
            meta: true,
          }) as unknown as Promise<{
            body: InferSearchResponseOf<TDocument, TSearchRequest>;
          }>,
          request,
          controller
        );
      });

      return unwrapEsResponse(promise);
    },
    mget<TDocument = ProfilingESEvent>(
      operationName: string,
      mgetRequest: MgetRequest
    ): Promise<MgetResponse<TDocument>> {
      const controller = new AbortController();

      const promise = withProfilingSpan(operationName, () => {
        return cancelEsRequestOnAbort(
          esClient.mget<TDocument>(mgetRequest, {
            signal: controller.signal,
            meta: true,
          }),
          request,
          controller
        );
      });

      return unwrapEsResponse(promise);
    },
    profilingStacktraces({ query, sampleSize }) {
      const controller = new AbortController();

      const promise = withProfilingSpan('_profiling/stacktraces', () => {
        return cancelEsRequestOnAbort(
          esClient.transport.request(
            {
              method: 'POST',
              path: encodeURI('/_profiling/stacktraces'),
              body: {
                query,
                sample_size: sampleSize,
              },
            },
            {
              signal: controller.signal,
              meta: true,
            }
          ),
          request,
          controller
        );
      });

      return unwrapEsResponse(promise) as Promise<StackTraceResponse>;
    },
    getEsClient() {
      return esClient;
    },
  };
}
