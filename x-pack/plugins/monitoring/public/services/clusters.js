/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ajaxErrorHandlersProvider } from '../lib/ajax_error_handler';
import { Legacy } from '../legacy_shims';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../common/constants';
import { showInternalMonitoringToast } from '../lib/internal_monitoring_toasts';
import { showSecurityToast } from '../alerts/lib/security_toasts';

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
let inTransit = false;

export function monitoringClustersProvider($injector) {
  return (clusterUuid, ccs, codePaths) => {
    const { min, max } = Legacy.shims.timefilter.getBounds();

    // append clusterUuid if the parameter is given
    let url = '../api/monitoring/v1/clusters';
    if (clusterUuid) {
      url += `/${clusterUuid}`;
    }

    const $http = $injector.get('$http');

    function getClusters() {
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
    }

    function ensureAlertsEnabled() {
      return $http.post('../api/monitoring/v1/alerts/enable', {}).catch((err) => {
        const Private = $injector.get('Private');
        const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
        return ajaxErrorHandlers(err);
      });
    }

    function ensureMetricbeatEnabled() {
      if (Legacy.shims.isCloud) {
        return Promise.resolve();
      }
      const globalState = $injector.get('globalState');
      return $http
        .post('../api/monitoring/v1/elasticsearch_settings/check/internal_monitoring', {
          ccs: globalState.ccs,
        })
        .then(({ data }) => {
          showInternalMonitoringToast({
            legacyIndices: data.legacy_indices,
            metricbeatIndices: data.mb_indices,
          });
        })
        .catch((err) => {
          const Private = $injector.get('Private');
          const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
          return ajaxErrorHandlers(err);
        });
    }

    if (!once && !inTransit) {
      inTransit = true;
      return getClusters().then((clusters) => {
        if (clusters.length) {
          Promise.all([ensureAlertsEnabled(), ensureMetricbeatEnabled()])
            .then(([{ data }]) => {
              showSecurityToast(data);
              once = true;
            })
            .catch(() => {
              // Intentionally swallow the error as this will retry the next page load
            })
            .finally(() => (inTransit = false));
        }
        return clusters;
      });
    }
    return getClusters();
  };
}
