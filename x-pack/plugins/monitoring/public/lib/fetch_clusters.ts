/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpHandler } from '@kbn/core/public';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../common/constants';

interface Params {
  timeRange: { min: string; max: string };
  fetch: HttpHandler;
  clusterUuid?: string | null;
  ccs?: boolean;
  codePaths?: string[];
}

export function formatClusters(clusters: any) {
  return clusters.map(formatCluster);
}

export function formatCluster(cluster: any) {
  if (cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID) {
    cluster.cluster_name = 'Standalone Cluster';
  }
  return cluster;
}

export const fetchClusters = async ({ clusterUuid, timeRange, fetch, ccs, codePaths }: Params) => {
  let url = '../api/monitoring/v1/clusters';
  if (clusterUuid) {
    url += `/${clusterUuid}`;
  }
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      ccs,
      timeRange,
      codePaths,
    }),
  });

  return formatClusters(response);
};
