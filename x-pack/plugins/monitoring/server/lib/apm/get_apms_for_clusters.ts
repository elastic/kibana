/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegacyRequest, Cluster } from '../../types';
import { createApmQuery } from './create_apm_query';
import { ApmMetric } from '../metrics';
import { apmAggResponseHandler, apmUuidsAgg, apmAggFilterPath } from './_apm_stats';
import { getTimeOfLastEvent } from './_get_time_of_last_event';
import { ElasticsearchResponse } from '../../../common/types/es';
import { getLegacyIndexPattern } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';

export function handleResponse(clusterUuid: string, response: ElasticsearchResponse) {
  const { apmTotal, totalEvents, memRss, versions } = apmAggResponseHandler(response);

  // combine stats
  const stats = {
    totalEvents,
    memRss,
    apms: {
      total: apmTotal,
    },
    versions,
  };

  return {
    clusterUuid,
    stats,
  };
}

export function getApmsForClusters(req: LegacyRequest, clusters: Cluster[], ccs?: string[]) {
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;
  const config = req.server.config;
  const maxBucketSize = config.ui.max_bucket_size;
  const cgroup = config.ui.container.apm.enabled;

  const indexPatterns = getLegacyIndexPattern({
    moduleType: 'beats',
    ccs: ccs || req.payload.ccs,
    config: Globals.app.config,
  });

  return Promise.all(
    clusters.map(async (cluster) => {
      const clusterUuid = cluster.elasticsearch?.cluster?.id ?? cluster.cluster_uuid;
      const params = {
        index: indexPatterns,
        size: 0,
        ignore_unavailable: true,
        filter_path: apmAggFilterPath,
        body: {
          query: createApmQuery({
            start,
            end,
            clusterUuid,
            metric: ApmMetric.getMetricFields(), // override default of BeatMetric.getMetricFields
          }),
          aggs: apmUuidsAgg(maxBucketSize, cgroup),
        },
      };

      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
      const [response, timeOfLastEvent] = await Promise.all([
        callWithRequest(req, 'search', params),
        getTimeOfLastEvent({
          req,
          callWithRequest,
          apmIndexPattern: indexPatterns,
          start,
          end,
          clusterUuid,
        }),
      ]);

      const formattedResponse = handleResponse(clusterUuid, response);
      return {
        ...formattedResponse,
        config: {
          container: cgroup,
        },
        stats: {
          ...formattedResponse.stats,
          timeOfLastEvent,
        },
      };
    })
  );
}
