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
import { unwrapEsResponse } from '@kbn/observability-plugin/common/utils/unwrap_es_response';
import {
  MsearchMultisearchBody,
  MsearchMultisearchHeader,
} from '@elastic/elasticsearch/lib/api/types';

export const SERVICE_ENTITIES_LATEST_ALIAS = entitiesAliasPattern({
  type: 'service',
  dataset: ENTITY_LATEST,
});
export const HOST_ENTITIES_LATEST_ALIAS = entitiesAliasPattern({
  type: 'host',
  dataset: ENTITY_LATEST,
});
export const CONTAINER_ENTITIES_LATEST_ALIAS = entitiesAliasPattern({
  type: 'container',
  dataset: ENTITY_LATEST,
});
type LatestAlias =
  | typeof SERVICE_ENTITIES_LATEST_ALIAS
  | typeof HOST_ENTITIES_LATEST_ALIAS
  | typeof CONTAINER_ENTITIES_LATEST_ALIAS;

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
  search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
    indexName: string,
    searchRequest: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>>;
  msearch<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
    allSearches: TSearchRequest[]
  ): Promise<{ responses: Array<InferSearchResponseOf<TDocument, TSearchRequest>> }>;
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
    searchRequest: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
    const controller = new AbortController();

    const promise = cancelEsRequestOnAbort(
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

    return unwrapEsResponse(promise);
  }

  return {
    async search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
      entityIndexAlias: LatestAlias,
      searchRequest: TSearchRequest
    ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
      return search(entityIndexAlias, searchRequest);
    },

    async msearch<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
      allSearches: Array<TSearchRequest & { index: LatestAlias }>
    ): Promise<{ responses: Array<InferSearchResponseOf<TDocument, TSearchRequest>> }> {
      const searches = allSearches
        .map((params) => {
          const searchParams: [MsearchMultisearchHeader, MsearchMultisearchBody] = [
            {
              index: [params.index],
              ignore_unavailable: true,
            },
            {
              ...params.body,
            },
          ];

          return searchParams;
        })
        .flat();

      const promise = esClient.msearch(
        { searches },
        {
          meta: true,
        }
      ) as unknown as Promise<{
        body: { responses: Array<InferSearchResponseOf<TDocument, TSearchRequest>> };
      }>;

      const { body } = await promise;
      return { responses: body.responses };
    },
  };
}
