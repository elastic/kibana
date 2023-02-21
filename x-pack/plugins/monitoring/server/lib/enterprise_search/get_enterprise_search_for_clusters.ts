/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegacyRequest, Cluster } from '../../types';
import { checkParam } from '../error_missing_required';
import { createEnterpriseSearchQuery } from './create_enterprise_search_query';
import { EnterpriseSearchMetric } from '../metrics';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';

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

  return Promise.all(
    clusters.map(async (cluster) => {

      // TODO: Need to check how to insert cluster_uuid into the metric at top-level
      const clusterUuid = cluster.elasticsearch?.cluster?.id ?? cluster.cluster_uuid;
      const params = {
        index: entSearchIndexPattern,
        size: 1,
        ignore_unavailable: true,
        body: {
          query: createEnterpriseSearchQuery({
            start,
            end,
            uuid: clusterUuid,
            clusterUuid: STANDALONE_CLUSTER_CLUSTER_UUID,
            metric: EnterpriseSearchMetric.getMetricFields(),
          }),
          sort: { '@timestamp': 'desc' },
        },
      };

      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
      const response = await callWithRequest(req, 'search', params);

      return response;
    })
  );
}
