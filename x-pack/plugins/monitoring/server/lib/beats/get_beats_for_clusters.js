/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkParam } from '../error_missing_required';
import { BeatsClusterMetric } from '../metrics';
import { createBeatsQuery } from './create_beats_query';
import { beatsAggFilterPath, beatsUuidsAgg, beatsAggResponseHandler } from './_beats_stats';

export function handleResponse(clusterUuid, response) {
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

export function getBeatsForClusters(req, beatsIndexPattern, clusters) {
  checkParam(beatsIndexPattern, 'beatsIndexPattern in beats/getBeatsForClusters');

  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;
  const config = req.server.config();
  const maxBucketSize = config.get('monitoring.ui.max_bucket_size');

  return Promise.all(
    clusters.map(async (cluster) => {
      const clusterUuid = cluster.cluster_uuid;
      const params = {
        index: beatsIndexPattern,
        size: 0,
        ignoreUnavailable: true,
        filterPath: beatsAggFilterPath,
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
