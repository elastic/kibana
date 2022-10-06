/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { MgetRequest, MgetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { unwrapEsResponse } from '@kbn/observability-plugin/server';
import { ProfilingESEvent } from '../../common/elasticsearch';
import { withProfilingSpan } from './with_profiling_span';

export interface ProfilingESClient {
  search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
    operationName: string,
    searchRequest: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>>;
  mget<TDocument = ProfilingESEvent>(
    operationName: string,
    mgetRequest: MgetRequest
  ): Promise<MgetResponse<TDocument>>;
}

function createProfilingEsClient({
  signal,
  esClient,
}: {
  esClient: ElasticsearchClient;
  signal: AbortSignal;
}): ProfilingESClient {
  return {
    search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
      operationName: string,
      searchRequest: TSearchRequest
    ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
      const promise = withProfilingSpan(operationName, () => {
        return esClient.search(searchRequest, {
          signal,
          meta: true,
        }) as unknown as Promise<{
          body: InferSearchResponseOf<TDocument, TSearchRequest>;
        }>;
      });

      return unwrapEsResponse(promise);
    },
    mget<TDocument = ProfilingESEvent>(
      operationName: string,
      mgetRequest: MgetRequest
    ): Promise<MgetResponse<TDocument>> {
      const promise = withProfilingSpan(operationName, () => {
        return esClient.mget<TDocument>(mgetRequest, {
          signal,
          meta: true,
        });
      });

      return unwrapEsResponse(promise);
    },
  };
}

export function getAbortSignalFromRequest(request: KibanaRequest) {
  const controller = new AbortController();
  request.events.aborted$.subscribe(() => {
    controller.abort();
  });

  return controller.signal;
}

export function createProfilingEsClientFromRequest({
  request,
  esClient,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
}) {
  return createProfilingEsClient({
    esClient,
    signal: getAbortSignalFromRequest(request),
  });
}

export function createProfilingEsClientInWorkerThread({
  username,
  password,
  hosts,
  signal,
}: {
  username: string;
  password: string;
  hosts: string;
  signal: AbortSignal;
}) {
  return createProfilingEsClient({
    esClient: new Client({
      node: hosts,
      auth: {
        username,
        password,
      },
    }),
    signal,
  });
}
