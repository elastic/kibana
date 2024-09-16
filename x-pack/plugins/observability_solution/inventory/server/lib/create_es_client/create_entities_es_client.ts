/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { KibanaRequest } from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core/server';
import { entitiesAliasPattern, ENTITY_LATEST } from '@kbn/entities-schema';
import { unwrapEsResponse } from '@kbn/observability-shared-plugin/common/utils/unwrap_es_response';
import { withApmSpan } from '../../utils/with_apm_span';

const ENTITIES_LATEST_ALIAS = entitiesAliasPattern({
  type: '*',
  dataset: ENTITY_LATEST,
});

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

export interface EntitiesESClient {
  searchLatest<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
    operationName: string,
    searchRequest: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>>;
}

export function createEntitiesESClient({
  request,
  esClient,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
}) {
  function search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
    indexName: string,
    operationName: string,
    searchRequest: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
    const controller = new AbortController();

    const promise = withApmSpan(operationName, () => {
      return cancelEsRequestOnAbort(
        esClient.search(
          { ...searchRequest, index: [indexName], ignore_unavailable: true },
          {
            signal: controller.signal,
            meta: true,
          }
        ) as unknown as Promise<{
          body: InferSearchResponseOf<TDocument, TSearchRequest>;
        }>,
        request,
        controller
      );
    });

    return unwrapEsResponse(promise);
  }

  return {
    searchLatest<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
      operationName: string,
      searchRequest: TSearchRequest
    ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
      return search(ENTITIES_LATEST_ALIAS, operationName, searchRequest);
    },
  };
}
