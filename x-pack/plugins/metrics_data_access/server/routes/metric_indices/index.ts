/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { SetupRouteOptions } from '../types';
import { MetricIndicesAPIResponse } from '../../../common/http_api/metric_indices';

function getIndexStatus(client: ElasticsearchClient, index: string) {
  return client
    .search({
      ignore_unavailable: true,
      allow_no_indices: true,
      index,
      size: 0,
      terminate_after: 1,
      track_total_hits: 1,
    })
    .then(
      (response) => {
        if (response._shards.total <= 0) {
          return 'missing';
        }

        if ((response.hits.total as SearchTotalHits).value > 0) {
          return 'available';
        }

        return 'empty';
      },
      (err) => {
        if (err.status === 404) {
          return 'missing';
        }

        throw err;
      }
    );
}

export function initMetricIndicesRoute<T extends RequestHandlerContext>({
  router,
  metricsClient,
}: SetupRouteOptions<T>) {
  router.get<unknown, unknown, MetricIndicesAPIResponse>(
    {
      path: `/api/metrics/indices`,
      validate: false,
    },
    async (context, _req, res) => {
      const savedObjectsClient = (await context.core).savedObjects.client;
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const metricIndices = await metricsClient.getMetricIndices({ savedObjectsClient });
      const metricIndicesStatus = await getIndexStatus(esClient, metricIndices);
      return res.ok({
        body: { metricIndices, metricIndicesExist: metricIndicesStatus !== 'missing' },
      });
    }
  );
}
