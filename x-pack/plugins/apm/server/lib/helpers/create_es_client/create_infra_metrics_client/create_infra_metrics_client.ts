/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { APMRouteHandlerResources } from '../../../../routes/typings';
import { getInfraMetricIndices } from '../../get_infra_metric_indices';

type InfraMetricsSearchParams = Omit<ESSearchRequest, 'index'> & {
  size: number;
  track_total_hits: boolean | number;
};

export type InfraMetricsClient = ReturnType<typeof createInfraMetricsClient>;

export function createInfraMetricsClient(resources: APMRouteHandlerResources) {
  return {
    async search<TDocument, TParams extends InfraMetricsSearchParams>(
      opts: TParams
    ): Promise<InferSearchResponseOf<TDocument, TParams>> {
      const {
        savedObjects: { client: savedObjectsClient },
        elasticsearch: { client: esClient },
      } = await resources.context.core;

      const indexName = await getInfraMetricIndices({
        infraPlugin: resources.plugins.infra,
        savedObjectsClient,
      });

      const searchParams = {
        index: [indexName],
        ...opts,
      };

      return esClient.asCurrentUser.search<TDocument>(
        searchParams
      ) as Promise<any>;
    },
  };
}
