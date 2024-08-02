/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { KibanaRequest } from '@kbn/core/server';
import { unwrapEsResponse } from '@kbn/observability-plugin/common/utils/unwrap_es_response';
import {
  MsearchMultisearchBody,
  MsearchMultisearchHeader,
} from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_HISTORY, ENTITY_LATEST } from '@kbn/entities-data-access-plugin/common';
import { withApmSpan } from '../../../../utils/with_apm_span';
import { MinimalAPMRouteHandlerResources } from '../../../../routes/apm_routes/register_apm_server_routes';
import { EntityType } from '../../../../routes/entities/types';

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
  searchHistory<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
    operationName: string,
    searchRequest: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>>;
  msearch<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
    allSearches: TSearchRequest[]
  ): Promise<{ responses: Array<InferSearchResponseOf<TDocument, TSearchRequest>> }>;
}

export async function createEntitiesESClient({
  context,
  request,
  plugins,
}: Pick<MinimalAPMRouteHandlerResources, 'context' | 'request' | 'plugins'>) {
  const [coreContext, entitiesDataAccessStart] = await Promise.all([
    context.core,
    plugins.entitiesDataAccess.start(),
  ]);

  const esClient = coreContext.elasticsearch.client.asCurrentUser;

  function search<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
    indexName: string,
    operationName: string,
    searchRequest: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
    const controller = new AbortController();

    const promise = withApmSpan(operationName, () => {
      return cancelEsRequestOnAbort(
        esClient.search(
          { ...searchRequest, index: [indexName] },
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
    async searchLatest<
      TDocument = unknown,
      TSearchRequest extends ESSearchRequest = ESSearchRequest
    >(
      operationName: string,
      searchRequest: TSearchRequest
    ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
      const { latestIndexPattern: entitiesLatestIndexPattern } =
        await entitiesDataAccessStart.services.indexPatternService.indexPatternByType(
          EntityType.SERVICE,
          {
            datasets: [ENTITY_LATEST],
            soClient: coreContext.savedObjects.client,
          }
        );

      return search(entitiesLatestIndexPattern!, operationName, searchRequest);
    },

    async searchHistory<
      TDocument = unknown,
      TSearchRequest extends ESSearchRequest = ESSearchRequest
    >(
      operationName: string,
      searchRequest: TSearchRequest
    ): Promise<InferSearchResponseOf<TDocument, TSearchRequest>> {
      const { historyIndexPattern: entitiesHistoryIndexPattern } =
        await entitiesDataAccessStart.services.indexPatternService.indexPatternByType(
          EntityType.SERVICE,
          {
            datasets: [ENTITY_HISTORY],
            soClient: coreContext.savedObjects.client,
          }
        );

      return search(entitiesHistoryIndexPattern!, operationName, searchRequest);
    },

    async msearch<TDocument = unknown, TSearchRequest extends ESSearchRequest = ESSearchRequest>(
      allSearches: TSearchRequest[]
    ): Promise<{ responses: Array<InferSearchResponseOf<TDocument, TSearchRequest>> }> {
      const { latestIndexPattern: entitiesLatestIndexPattern } =
        await entitiesDataAccessStart.services.indexPatternService.indexPatternByType(
          EntityType.SERVICE,
          {
            datasets: [ENTITY_LATEST],
            soClient: coreContext.savedObjects.client,
          }
        );

      const searches = allSearches
        .map((params) => {
          const searchParams: [MsearchMultisearchHeader, MsearchMultisearchBody] = [
            {
              index: [entitiesLatestIndexPattern!],
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
