/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchResponse } from '../../../common/types/es';
import { LegacyRequest, Cluster } from '../../types';
import { checkParam } from '../error_missing_required';
import { createEnterpriseSearchQuery } from './create_enterprise_search_query';
import { EnterpriseSearchMetric } from '../metrics';
import {
  entSearchAggFilterPath,
  entSearchAggResponseHandler,
  entSearchUuidsAgg,
} from './_enterprise_search_stats';

function handleResponse(clusterUuid: string, response: ElasticsearchResponse) {
  const stats = entSearchAggResponseHandler(response);

  return {
    clusterUuid,
    stats,
  };
}

export function getEnterpriseSearchForClusters(
  req: LegacyRequest,
  entSearchIndexPattern: string,
  clusters: Cluster[]
) {
  checkParam(
    entSearchIndexPattern,
    'entSearchIndexPattern in enterprise_earch/getEnterpriseSearchForClusters'
  );

  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;
  const config = req.server.config();
  const maxBucketSize = config.get('monitoring.ui.max_bucket_size');

  return Promise.all(
    clusters.map(async (cluster) => {
      const clusterUuid = cluster.elasticsearch?.cluster?.id ?? cluster.cluster_uuid;
      const params = {
        index: entSearchIndexPattern,
        size: 0,
        ignore_unavailable: true,
        filter_path: entSearchAggFilterPath,
        body: {
          query: createEnterpriseSearchQuery({
            start,
            end,
            uuid: clusterUuid,
            metric: EnterpriseSearchMetric.getMetricFields(),
          }),
          aggs: entSearchUuidsAgg(maxBucketSize!),
        },
      };

      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
      const response = await callWithRequest(req, 'search', params);
      return handleResponse(clusterUuid, response);
    })
  );
}
