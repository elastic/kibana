/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';
import type { estypes } from '@elastic/elasticsearch';
import { unwrapEsResponse } from '../../../../../../observability/server';
import { APMRouteHandlerResources } from '../../../../routes/typings';
import {
  ESSearchResponse,
  ESSearchRequest,
} from '../../../../../../../../src/core/types/elasticsearch';
import {
  callAsyncWithDebug,
  getDebugBody,
  getDebugTitle,
} from '../call_async_with_debug';
import { cancelEsRequestOnAbort } from '../cancel_es_request_on_abort';

export type APMIndexDocumentParams<T> = estypes.IndexRequest<T>;

export type APMInternalClient = ReturnType<typeof createInternalESClient>;

export function createInternalESClient({
  context,
  debug,
  request,
}: Pick<APMRouteHandlerResources, 'context' | 'request'> & { debug: boolean }) {
  const { asInternalUser } = context.core.elasticsearch.client;

  function callEs<T extends { body: any }>(
    operationName: string,
    {
      cb,
      requestType,
      params,
    }: {
      requestType: string;
      cb: () => TransportRequestPromise<T>;
      params: Record<string, any>;
    }
  ) {
    return callAsyncWithDebug({
      cb: () => unwrapEsResponse(cancelEsRequestOnAbort(cb(), request)),
      getDebugMessage: () => ({
        title: getDebugTitle(request),
        body: getDebugBody({ params, requestType, operationName }),
      }),
      debug,
      isCalledWithInternalUser: true,
      request,
      requestType,
      requestParams: params,
      operationName,
    });
  }

  return {
    search: async <
      TDocument = unknown,
      TSearchRequest extends ESSearchRequest = ESSearchRequest
    >(
      operationName: string,
      params: TSearchRequest
    ): Promise<ESSearchResponse<TDocument, TSearchRequest>> => {
      return callEs(operationName, {
        requestType: 'search',
        cb: () => asInternalUser.search(params),
        params,
      });
    },
    index: <T>(operationName: string, params: APMIndexDocumentParams<T>) => {
      return callEs(operationName, {
        requestType: 'index',
        cb: () => asInternalUser.index(params),
        params,
      });
    },
    delete: (
      operationName: string,
      params: estypes.DeleteRequest
    ): Promise<{ result: string }> => {
      return callEs(operationName, {
        requestType: 'delete',
        cb: () => asInternalUser.delete(params),
        params,
      });
    },
    indicesCreate: (
      operationName: string,
      params: estypes.IndicesCreateRequest
    ) => {
      return callEs(operationName, {
        requestType: 'indices.create',
        cb: () => asInternalUser.indices.create(params),
        params,
      });
    },
  };
}
