/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { unwrapEsResponse } from '@kbn/observability-plugin/server';
import type { ESSearchResponse, ESSearchRequest } from '@kbn/es-types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ElasticsearchRequestLoggingOptions } from '@kbn/core/server';
import {
  callAsyncWithDebug,
  cancelEsRequestOnAbort,
} from '@kbn/apm-data-access-plugin/server/utils';
import {
  type APMRouteHandlerResources,
  inspectableEsQueriesMap,
} from '../../../../routes/apm_routes/register_apm_server_routes';

export type APMIndexDocumentParams<T> = estypes.IndexRequest<T>;

export type APMInternalESClient = Awaited<ReturnType<typeof createInternalESClientWithResources>>;

export async function createInternalESClientWithResources({
  params,
  request,
  context,
}: APMRouteHandlerResources) {
  const coreContext = await context.core;
  const { asInternalUser } = coreContext.elasticsearch.client;
  const debug = params.query._inspect;

  return createInternalESClient({
    debug,
    request,
    elasticsearchClient: asInternalUser,
  });
}

export async function createInternalESClient({
  debug,
  request,
  elasticsearchClient,
}: {
  debug: boolean;
  request?: APMRouteHandlerResources['request'];
  elasticsearchClient: ElasticsearchClient;
}) {
  function callEs<T extends { body: any }>(
    operationName: string,
    {
      makeRequestWithSignal,
      params,
    }: {
      makeRequestWithSignal: (signal: AbortSignal) => Promise<T>;
      params: Record<string, any>;
    }
  ) {
    return callAsyncWithDebug({
      cb: () => {
        const controller = new AbortController();
        const res = makeRequestWithSignal(controller.signal);
        return unwrapEsResponse(request ? cancelEsRequestOnAbort(res, request, controller) : res);
      },
      debug,
      isCalledWithInternalUser: true,
      request,
      requestParams: params,
      operationName,
      inspectableEsQueriesMap,
    });
  }

  return {
    search: async <TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
      operationName: string,
      params: TSearchRequest
    ): Promise<ESSearchResponse<TDocument, TSearchRequest>> => {
      return callEs(operationName, {
        makeRequestWithSignal: (signal) =>
          elasticsearchClient.search(params, {
            signal,
            meta: true,
            context: {
              loggingOptions: getElasticsearchRequestLoggingOptions(),
            },
          }) as Promise<{ body: any }>,
        params,
      });
    },
    index: <T>(operationName: string, params: APMIndexDocumentParams<T>) => {
      return callEs(operationName, {
        makeRequestWithSignal: (signal) =>
          elasticsearchClient.index(params, {
            signal,
            meta: true,
            context: {
              loggingOptions: getElasticsearchRequestLoggingOptions(),
            },
          }),
        params,
      });
    },
    delete: (operationName: string, params: estypes.DeleteRequest): Promise<{ result: string }> => {
      return callEs(operationName, {
        makeRequestWithSignal: (signal) =>
          elasticsearchClient.delete(params, {
            signal,
            meta: true,
            context: {
              loggingOptions: getElasticsearchRequestLoggingOptions(),
            },
          }),
        params,
      });
    },
    indicesCreate: (operationName: string, params: estypes.IndicesCreateRequest) => {
      return callEs(operationName, {
        makeRequestWithSignal: (signal) =>
          elasticsearchClient.indices.create(params, {
            signal,
            meta: true,
            context: {
              loggingOptions: getElasticsearchRequestLoggingOptions(),
            },
          }),
        params,
      });
    },
  };
}

function getElasticsearchRequestLoggingOptions(): ElasticsearchRequestLoggingOptions {
  return {
    loggerName: 'apm',
  };
}
