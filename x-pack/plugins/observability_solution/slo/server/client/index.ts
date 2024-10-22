/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { castArray, once } from 'lodash';
import type { SLODefinition } from '../domain/models';
import { KibanaSavedObjectsSLORepository } from '../services';
import { getListOfSummaryIndices, getSloSettings } from '../services/slo_settings';

type SearchRequest = ESSearchRequest & {
  track_total_hits: number | boolean;
  size: number | boolean;
};

export interface SloClient {
  bulkGetSloDefinitions: (options: { ids: string[] }) => Promise<{ definitions: SLODefinition[] }>;
  getDataScopeForSummarySlos(options?: { ids?: string[]; start?: number; end?: number }): Promise<{
    index: string[];
    query: QueryDslQueryContainer;
  }>;
  searchSloSummaryIndex<TSearchRequest extends SearchRequest = never>(
    parameters: TSearchRequest
  ): Promise<
    InferSearchResponseOf<SLOWithSummaryResponse, TSearchRequest, { restTotalHitsAsInt: false }>
  >;
  getSummaryIndices(): Promise<string[]>;
}

export async function getSloClientWithRequest({
  request,
  logger,
  spaces,
  esClient,
  soClient,
}: {
  request: KibanaRequest;
  logger: Logger;
  spaces?: SpacesPluginStart;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
}): Promise<SloClient> {
  const space = await spaces?.spacesService.getActiveSpace(request);

  const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

  const observabilityEsClient = createObservabilityEsClient({
    client: esClient,
    logger,
    plugin: 'slo',
  });

  const getListOfSummaryIndicesOnce = once(async () => {
    const settings = await getSloSettings(soClient);

    const { indices } = await getListOfSummaryIndices(esClient, settings);

    return castArray(indices);
  });

  return {
    async bulkGetSloDefinitions({ ids }) {
      const definitions = await repository.findAllByIds(ids);
      return { definitions };
    },
    getSummaryIndices: async () => {
      return await getListOfSummaryIndicesOnce();
    },
    searchSloSummaryIndex: async (parameters) => {
      const index = await getListOfSummaryIndicesOnce();

      return observabilityEsClient.search('search_slo_summaries', {
        ...parameters,
        index,
      });
    },
    async getDataScopeForSummarySlos({ ids, start, end } = {}) {
      return {
        index: await getListOfSummaryIndicesOnce(),
        query: {
          bool: {
            filter: [
              ...(ids
                ? [
                    {
                      terms: {
                        'slo.id': ids,
                      },
                    },
                  ]
                : []),
              {
                range: {
                  'slo.createdAt': {
                    lte: end,
                  },
                },
              },
              {
                range: {
                  summaryUpdatedAt: {
                    gte: start,
                  },
                },
              },
              {
                term: {
                  spaceId: space?.id ?? 'default',
                },
              },
            ],
          },
        },
      };
    },
  };
}
