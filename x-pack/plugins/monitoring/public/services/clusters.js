/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ajaxErrorHandlersProvider } from '../lib/ajax_error_handler';
import { Legacy } from '../legacy_shims';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../common/constants';
import { showInternalMonitoringToast } from '../lib/internal_monitoring_toasts';

function formatClusters(clusters) {
  return clusters.map(formatCluster);
}

function formatCluster(cluster) {
  if (cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID) {
    cluster.cluster_name = 'Standalone Cluster';
  }
  return cluster;
}

let once = false;

export function monitoringClustersProvider($injector) {
  return async (clusterUuid, ccs, codePaths) => {
    const { min, max } = Legacy.shims.timefilter.getBounds();

    // append clusterUuid if the parameter is given
    let url = '../api/monitoring/v1/clusters';
    if (clusterUuid) {
      url += `/${clusterUuid}`;
    }

    const $http = $injector.get('$http');

    async function getClusters() {
      try {
        const response = await $http.post(
          url,
          {
            ccs,
            timeRange: {
              min: min.toISOString(),
              max: max.toISOString(),
            },
            codePaths,
          },
          { headers: { 'kbn-system-request': 'true' } }
        );
        return formatClusters(response.data);
      } catch (err) {
        const Private = $injector.get('Private');
        const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
        return ajaxErrorHandlers(err);
      }
    }

    async function ensureMetricbeatEnabled() {
      if (Legacy.shims.isCloud) {
        return;
      }
      const globalState = $injector.get('globalState');
      try {
        const response = await $http.post(
          '../api/monitoring/v1/elasticsearch_settings/check/internal_monitoring',
          {
            ccs: globalState.ccs,
          }
        );
        const { data } = response;
        showInternalMonitoringToast({
          legacyIndices: data.legacy_indices,
          metricbeatIndices: data.mb_indices,
        });
      } catch (err) {
        const Private = $injector.get('Private');
        const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
        return ajaxErrorHandlers(err);
      }
    }

    if (!once) {
      once = true;
      const clusters = await getClusters();
      if (clusters.length) {
        try {
          await ensureMetricbeatEnabled();
        } catch (_err) {
          // Intentionally swallow the error as this will retry the next page load
        }
      }
      return clusters;
    }
    return await getClusters();
  };
}
