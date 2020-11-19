/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IndexDocumentParams,
  IndicesCreateParams,
  DeleteDocumentResponse,
  DeleteDocumentParams,
} from 'elasticsearch';
import { KibanaRequest } from 'src/core/server';
import { APMRequestHandlerContext } from '../../../../routes/typings';
import {
  ESSearchResponse,
  ESSearchRequest,
} from '../../../../../../../typings/elasticsearch';
import { callClientWithDebug } from '../call_client_with_debug';

// `type` was deprecated in 7.0
export type APMIndexDocumentParams<T> = Omit<IndexDocumentParams<T>, 'type'>;

export type APMInternalClient = ReturnType<typeof createInternalESClient>;

export function createInternalESClient({
  context,
  request,
}: {
  context: APMRequestHandlerContext;
  request: KibanaRequest;
}) {
  const { callAsInternalUser } = context.core.elasticsearch.legacy.client;

  const callEs = (operationName: string, params: Record<string, any>) => {
    return callClientWithDebug({
      apiCaller: callAsInternalUser,
      operationName,
      params,
      request,
      debug: context.params.query._debug,
    });
  };

  return {
    search: async <
      TDocument = unknown,
      TSearchRequest extends ESSearchRequest = ESSearchRequest
    >(
      params: TSearchRequest
    ): Promise<ESSearchResponse<TDocument, TSearchRequest>> => {
      return callEs('search', params);
    },
    index: <Body>(params: APMIndexDocumentParams<Body>) => {
      return callEs('index', params);
    },
    delete: (
      params: Omit<DeleteDocumentParams, 'type'>
    ): Promise<DeleteDocumentResponse> => {
      return callEs('delete', params);
    },
    indicesCreate: (params: IndicesCreateParams) => {
      return callEs('indices.create', params);
    },
  };
}
