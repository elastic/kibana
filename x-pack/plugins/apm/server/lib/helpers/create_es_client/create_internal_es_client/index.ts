/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';
import {
  CreateIndexRequest,
  DeleteRequest,
  IndexRequest,
} from '@elastic/elasticsearch/api/types';
import { unwrapEsResponse } from '../../../../../../observability/server';
import { APMRouteHandlerResources } from '../../../../routes/typings';
import {
  ESSearchResponse,
  ESSearchRequest,
} from '../../../../../../../../typings/elasticsearch';
import {
  callAsyncWithDebug,
  getDebugBody,
  getDebugTitle,
} from '../call_async_with_debug';
import { cancelEsRequestOnAbort } from '../cancel_es_request_on_abort';

export type APMIndexDocumentParams<T> = IndexRequest<T>;

export type APMInternalClient = ReturnType<typeof createInternalESClient>;

export function createInternalESClient({
  context,
  debug,
  request,
}: Pick<APMRouteHandlerResources, 'context' | 'request'> & { debug: boolean }) {
  const { asInternalUser } = context.core.elasticsearch.client;

  function callEs<T extends { body: any }>({
    cb,
    requestType,
    params,
  }: {
    requestType: string;
    cb: () => TransportRequestPromise<T>;
    params: Record<string, any>;
  }) {
    return callAsyncWithDebug({
      cb: () => unwrapEsResponse(cancelEsRequestOnAbort(cb(), request)),
      getDebugMessage: () => ({
        title: getDebugTitle(request),
        body: getDebugBody(params, requestType),
      }),
      debug,
      isCalledWithInternalUser: true,
      request,
      requestType,
      requestParams: params,
    });
  }

  return {
    search: async <
      TDocument = unknown,
      TSearchRequest extends ESSearchRequest = ESSearchRequest
    >(
      params: TSearchRequest
    ): Promise<ESSearchResponse<TDocument, TSearchRequest>> => {
      return callEs({
        requestType: 'search',
        cb: () => asInternalUser.search(params),
        params,
      });
    },
    index: <T>(params: APMIndexDocumentParams<T>) => {
      return callEs({
        requestType: 'index',
        cb: () => asInternalUser.index(params),
        params,
      });
    },
    delete: (params: DeleteRequest): Promise<{ result: string }> => {
      return callEs({
        requestType: 'delete',
        cb: () => asInternalUser.delete(params),
        params,
      });
    },
    indicesCreate: (params: CreateIndexRequest) => {
      return callEs({
        requestType: 'indices.create',
        cb: () => asInternalUser.indices.create(params),
        params,
      });
    },
  };
}
