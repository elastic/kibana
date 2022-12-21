/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';

import { buildMonitoredClusters, MonitoredClusters } from './build_monitored_clusters';
import {
  monitoredClustersQuery,
  persistentMetricsetsQuery,
  enterpriseSearchQuery,
} from './monitored_clusters_query';
import type { FetchParameters, FetchExecution } from '../types';

interface MonitoredClustersResponse {
  clusters?: MonitoredClusters;
  execution: FetchExecution;
}

/**
 * executes multiple search requests to build a representation of the monitoring
 * documents. the queries aggregations are built with a similar hierarchy so
 * we can merge them to a single output
 */
export const fetchMonitoredClusters = async ({
  timeout,
  monitoringIndex,
  entSearchIndex,
  timeRange,
  search,
  logger,
}: FetchParameters & {
  monitoringIndex: string;
  entSearchIndex: string;
}): Promise<MonitoredClustersResponse> => {
  const getMonitoredClusters = async (
    index: string,
    body: any
  ): Promise<MonitoredClustersResponse> => {
    try {
      const { aggregations, timed_out: timedOut } = await search({
        index,
        body,
        size: 0,
        ignore_unavailable: true,
      });

      const buckets = aggregations?.clusters?.buckets ?? [];
      return {
        clusters: buildMonitoredClusters(buckets, logger),
        execution: { timedOut },
      };
    } catch (err) {
      logger.error(`fetchMonitoredClusters: failed to fetch:\n${err.stack}`);
      return { execution: { errors: [err.message] } };
    }
  };

  const results = await Promise.all([
    getMonitoredClusters(monitoringIndex, monitoredClustersQuery({ timeRange, timeout })),
    getMonitoredClusters(monitoringIndex, persistentMetricsetsQuery({ timeout })),
    getMonitoredClusters(entSearchIndex, enterpriseSearchQuery({ timeRange, timeout })),
  ]);

  return {
    clusters: merge({}, ...results.map(({ clusters }) => clusters)),

    execution: results
      .map(({ execution }) => execution)
      .reduce(
        (acc, execution) => {
          return {
            timedOut: Boolean(acc.timedOut || execution.timedOut),
            errors: acc.errors!.concat(execution.errors || []),
          };
        },
        {
          timedOut: false,
          errors: [],
        }
      ),
  };
};
