/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { MetricsDataPluginSetup } from '@kbn/metrics-data-access-plugin/server';
import type { APMRouteHandlerResources } from '../../../../routes/apm_routes/register_apm_server_routes';

type InfraMetricsSearchParams = Omit<ESSearchRequest, 'index'> & {
  size: number;
  track_total_hits: boolean | number;
};

export type InfraMetricsClient = ReturnType<typeof createInfraMetricsClientWith>;

/** Builds an infrastructure metrics client from an explicit saved-objects lookup and Elasticsearch client. */
export function createInfraMetricsClientWith({
  metricsClient,
  getSavedObjectsClient,
  esClient,
}: {
  metricsClient: MetricsDataPluginSetup['client'];
  getSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  esClient: ElasticsearchClient;
}): {
  search: <TDocument, TParams extends InfraMetricsSearchParams>(
    opts: TParams
  ) => Promise<InferSearchResponseOf<TDocument, TParams>>;
} {
  return {
    async search<TDocument, TParams extends InfraMetricsSearchParams>(
      opts: TParams
    ): Promise<InferSearchResponseOf<TDocument, TParams>> {
      const savedObjectsClient = await getSavedObjectsClient();
      const indexName = await metricsClient.getMetricIndices({
        savedObjectsClient,
      });

      return esClient.search<TDocument>({
        index: [indexName],
        ...opts,
      }) as Promise<InferSearchResponseOf<TDocument, TParams>>;
    },
  };
}

export function createInfraMetricsClient(resources: APMRouteHandlerResources): InfraMetricsClient {
  const metricsClient = resources.plugins.metricsDataAccess.setup.client;

  return {
    async search(opts) {
      const {
        savedObjects: { client: savedObjectsClient },
        elasticsearch: { client: esClient },
      } = await resources.context.core;

      return createInfraMetricsClientWith({
        metricsClient,
        getSavedObjectsClient: async () => savedObjectsClient,
        esClient: esClient.asCurrentUser,
      }).search(opts);
    },
  };
}
