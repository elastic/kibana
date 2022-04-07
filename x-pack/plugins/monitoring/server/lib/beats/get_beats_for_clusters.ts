/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BeatsClusterMetric } from '../metrics';
import { createBeatsQuery } from './create_beats_query';
import { beatsAggFilterPath, beatsUuidsAgg, beatsAggResponseHandler } from './_beats_stats';
import type { ElasticsearchResponse } from '../../../common/types/es';
import { LegacyRequest, Cluster } from '../../types';
import { getLegacyIndexPattern } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';

export function handleResponse(clusterUuid: string, response: ElasticsearchResponse) {
  const { beatTotal, beatTypes, totalEvents, bytesSent } = beatsAggResponseHandler(response);

  // combine stats
  const stats = {
    totalEvents,
    bytesSent,
    beats: {
      total: beatTotal,
      types: beatTypes,
    },
  };

  return {
    clusterUuid,
    stats,
  };
}

export function getBeatsForClusters(req: LegacyRequest, clusters: Cluster[], ccs: string[]) {
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;
  const config = req.server.config;
  const maxBucketSize = config.ui.max_bucket_size;
  const indexPatterns = getLegacyIndexPattern({
    moduleType: 'beats',
    ccs,
    config: Globals.app.config,
  });
  return Promise.all(
    clusters.map(async (cluster) => {
      const clusterUuid = cluster.elasticsearch?.cluster?.id ?? cluster.cluster_uuid;
      const params = {
        index: indexPatterns,
        size: 0,
        ignore_unavailable: true,
        filter_path: beatsAggFilterPath,
        body: {
          query: createBeatsQuery({
            start,
            end,
            clusterUuid,
            metric: BeatsClusterMetric.getMetricFields(), // override default of BeatMetric.getMetricFields
          }),
          aggs: beatsUuidsAgg(maxBucketSize),
        },
      };

      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
      const response = await callWithRequest(req, 'search', params);
      return handleResponse(clusterUuid, response);
    })
  );
}
