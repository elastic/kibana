import { merge } from 'lodash';

import { buildMonitoredClusters } from './build_monitored_clusters';
import { monitoredClustersQuery, stableMetricsetsQuery } from './monitored_clusters_query';

const getClustersBuckets = ({ clusters, standalone }) => {
  return clusters.buckets.concat({
    key: 'standalone',
    ...standalone,
  });
};

export const fetchMonitoredClusters = async (search) => {
  const index = '*:.monitoring-*,.monitoring-*';

  const results = await Promise.all([
    search({
      index,
      size: 0,
      ignore_unavailable: true,
      body: monitoredClustersQuery(),
    })
      .then((response) => getClustersBuckets(response.aggregations))
      .then(buildMonitoredClusters),

    search({
      index,
      size: 0,
      ignore_unavailable: true,
      body: stableMetricsetsQuery(),
    })
      .then((response) => getClustersBuckets(response.aggregations))
      .then(buildMonitoredClusters),
  ]);

  return merge(...results);
};
