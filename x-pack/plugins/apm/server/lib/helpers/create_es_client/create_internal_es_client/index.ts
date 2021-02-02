/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'src/core/server';
import { RequestParams } from '@elastic/elasticsearch';
import { TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';
import { unwrapEsResponse } from '../../../../../../observability/server';
import { APMRequestHandlerContext } from '../../../../routes/typings';
import {
  ESSearchResponse,
  ESSearchRequest,
} from '../../../../../../../typings/elasticsearch';
import {
  callAsyncWithDebug,
  getDebugBody,
  getDebugTitle,
} from '../call_async_with_debug';
import { cancelEsRequestOnAbort } from '../cancel_es_request_on_abort';

export type APMIndexDocumentParams<T> = RequestParams.Index<T>;

export type APMInternalClient = ReturnType<typeof createInternalESClient>;

export function createInternalESClient({
  context,
  request,
}: {
  context: APMRequestHandlerContext;
  request: KibanaRequest;
}) {
  const { asInternalUser } = context.core.elasticsearch.client;

  function callEs<T extends { body: any }>({
    cb,
    operationName,
    params,
  }: {
    operationName: string;
    cb: () => TransportRequestPromise<T>;
    params: Record<string, any>;
  }) {
    return callAsyncWithDebug({
      cb: () => unwrapEsResponse(cancelEsRequestOnAbort(cb(), request)),
      getDebugMessage: () => ({
        title: getDebugTitle(request),
        body: getDebugBody(params, operationName),
      }),
      debug: context.params.query._debug,
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
        operationName: 'search',
        cb: () => asInternalUser.search(params),
        params,
      });
    },
    index: <T>(params: APMIndexDocumentParams<T>) => {
      return callEs({
        operationName: 'index',
        cb: () => asInternalUser.index(params),
        params,
      });
    },
    delete: (params: RequestParams.Delete): Promise<{ result: string }> => {
      return callEs({
        operationName: 'delete',
        cb: () => asInternalUser.delete(params),
        params,
      });
    },
    indicesCreate: (params: RequestParams.IndicesCreate) => {
      return callEs({
        operationName: 'indices.create',
        cb: () => asInternalUser.indices.create(params),
        params,
      });
    },
  };
}
