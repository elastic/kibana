/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { KibanaRequest } from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core/server';
import { unwrapEsResponse } from '@kbn/observability-plugin/common/utils/unwrap_es_response';
import {
  MsearchMultisearchBody,
  MsearchMultisearchHeader,
} from '@elastic/elasticsearch/lib/api/types';
import { withApmSpan } from '../../../../utils/with_apm_span';

const ENTITIES_INDEX_NAME = '.entities-observability.latest-*';

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
    operationName: string,
    searchRequest: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>>;
  msearch<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
    allSearches: TSearchRequest[]
  ): Promise<{ responses: Array<InferSearchResponseOf<TDocument, TSearchRequest>> }>;
}

export async function createEntitiesESClient({
  request,
  esClient,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
}) {
  return {
    search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
      operationName: string,
      searchRequest: TSearchRequest
    ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
      const controller = new AbortController();

      const promise = withApmSpan(operationName, () => {
        return cancelEsRequestOnAbort(
          esClient.search(
            { ...searchRequest, index: [ENTITIES_INDEX_NAME] },
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
    },

    async msearch<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
      allSearches: TSearchRequest[]
    ): Promise<{ responses: Array<InferSearchResponseOf<TDocument, TSearchRequest>> }> {
      const searches = allSearches
        .map((params) => {
          const searchParams: [MsearchMultisearchHeader, MsearchMultisearchBody] = [
            {
              index: [ENTITIES_INDEX_NAME],
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
