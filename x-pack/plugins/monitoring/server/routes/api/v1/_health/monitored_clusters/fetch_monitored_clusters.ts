/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';

import { ElasticsearchResponse } from '../../../../../../common/types/es';
import { TimeRange } from '../../../../../../common/http_api/shared';

import { buildMonitoredClusters } from './build_monitored_clusters';
import { monitoredClustersQuery, stableMetricsetsQuery } from './monitored_clusters_query';

type SearchFn = (params: any) => Promise<ElasticsearchResponse>;

export const fetchMonitoredClusters = async ({
  index,
  timeRange,
  search,
}: {
  index: string;
  timeRange: TimeRange;
  search: SearchFn;
}) => {
  const results = await Promise.all([
    search({
      index,
      size: 0,
      ignore_unavailable: true,
      body: monitoredClustersQuery(timeRange),
    })
      .then(({ aggregations }) => aggregations?.clusters?.buckets ?? [])
      .then(buildMonitoredClusters),

    search({
      index,
      size: 0,
      ignore_unavailable: true,
      body: stableMetricsetsQuery(),
    })
      .then(({ aggregations }) => aggregations?.clusters?.buckets ?? [])
      .then(buildMonitoredClusters),
  ]);

  return merge(...results);
};
