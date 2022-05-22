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
import {
  enterpriseSearchQuery,
  monitoredClustersQuery,
  persistentMetricsetsQuery,
} from './monitored_clusters_query';

type SearchFn = (params: any) => Promise<ElasticsearchResponse>;

export const fetchMonitoredClusters = async ({
  monitoringIndex,
  entSearchIndex,
  timeRange,
  search,
}: {
  monitoringIndex: string;
  entSearchIndex: string;
  timeRange: TimeRange;
  search: SearchFn;
}) => {
  const getMonitoredClusters = (index: string, body: any) =>
    search({ index, body, size: 0, ignore_unavailable: true })
      .then(({ aggregations }) => aggregations?.clusters?.buckets ?? [])
      .then(buildMonitoredClusters);

  const results = await Promise.all([
    getMonitoredClusters(monitoringIndex, monitoredClustersQuery(timeRange)),
    getMonitoredClusters(monitoringIndex, persistentMetricsetsQuery()),
    getMonitoredClusters(entSearchIndex, enterpriseSearchQuery(timeRange)),
  ]);

  return merge(...results);
};
