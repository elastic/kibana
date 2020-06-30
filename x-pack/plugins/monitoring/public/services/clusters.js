/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ajaxErrorHandlersProvider } from '../lib/ajax_error_handler';
import { Legacy } from '../legacy_shims';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../common/constants';

function formatClusters(clusters) {
  return clusters.map(formatCluster);
}

function formatCluster(cluster) {
  if (cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID) {
    cluster.cluster_name = 'Standalone Cluster';
  }
  return cluster;
}

export function monitoringClustersProvider($injector) {
  return (clusterUuid, ccs, codePaths) => {
    const { min, max } = Legacy.shims.timefilter.getBounds();

    // append clusterUuid if the parameter is given
    let url = '../api/monitoring/v1/clusters';
    if (clusterUuid) {
      url += `/${clusterUuid}`;
    }

    const $http = $injector.get('$http');
    return $http
      .post(url, {
        ccs,
        timeRange: {
          min: min.toISOString(),
          max: max.toISOString(),
        },
        codePaths,
      })
      .then((response) => response.data)
      .then((data) => {
        return formatClusters(data); // return set of clusters
      })
      .catch((err) => {
        const Private = $injector.get('Private');
        const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
        return ajaxErrorHandlers(err);
      });
  };
}
