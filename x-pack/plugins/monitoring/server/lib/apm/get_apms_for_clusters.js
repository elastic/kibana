/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkParam } from '../error_missing_required';
import { createApmQuery } from './create_apm_query';
import { ApmMetric } from '../metrics';
import { apmAggResponseHandler, apmUuidsAgg, apmAggFilterPath } from './_apm_stats';

export function handleResponse(clusterUuid, response) {
  const { beatTotal, beatTypes, totalEvents, bytesSent } = apmAggResponseHandler(response);

  // combine stats
  const stats = {
    totalEvents,
    bytesSent,
    beats: {
      total: beatTotal,
      types: beatTypes,
    }
  };

  return {
    clusterUuid,
    stats,
  };
}

export function getApmsForClusters(req, apmIndexPattern, clusters) {
  checkParam(apmIndexPattern, 'apmIndexPattern in apms/getApmsForClusters');

  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;
  const config = req.server.config();
  const maxBucketSize = config.get('xpack.monitoring.max_bucket_size');

  return Promise.all(clusters.map(async cluster => {
    const clusterUuid = cluster.cluster_uuid;
    const params = {
      index: apmIndexPattern,
      size: 0,
      ignoreUnavailable: true,
      filterPath: apmAggFilterPath,
      body: {
        query: createApmQuery({
          start,
          end,
          clusterUuid,
          metric: ApmMetric.getMetricFields() // override default of BeatMetric.getMetricFields
        }),
        aggs: apmUuidsAgg(maxBucketSize)
      },
    };

    const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
    const response = await callWithRequest(req, 'search', params);
    return handleResponse(clusterUuid, response);
  }));
}
