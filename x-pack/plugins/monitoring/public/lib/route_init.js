/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ajaxErrorHandlersProvider } from './ajax_error_handler';
import { isInSetupMode } from './setup_mode';
import { getClusterFromClusters } from './get_cluster_from_clusters';

export function routeInitProvider(Private, monitoringClusters, globalState, license) {
  const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);

  function isOnPage(hash) {
    return _.includes(window.location.hash, hash);
  }

  /*
   * returns true if:
   * license is not basic or
   * the data just has a single cluster or
   * all the clusters are basic and this is the primary cluster
   */
  return function routeInit({ codePaths, fetchAllClusters }) {
    const clusterUuid = fetchAllClusters ? null : globalState.cluster_uuid;
    return (
      monitoringClusters(clusterUuid, undefined, codePaths)
        // Set the clusters collection and current cluster in globalState
        .then((clusters) => {
          const inSetupMode = isInSetupMode();
          const cluster = getClusterFromClusters(clusters, globalState);
          if (!cluster && !inSetupMode) {
            window.history.replaceState(null, null, '#/no-data');
            return Promise.resolve();
          }

          if (cluster) {
            license.setLicense(cluster.license);

            // check if we need to redirect because of license problems
            if (!(isOnPage('license') || isOnPage('home')) && license.isExpired()) {
              window.history.replaceState(null, null, '#/license');
              return Promise.resolve();
            }

            // check if we need to redirect because of attempt at unsupported multi-cluster monitoring
            const clusterSupported = cluster.isSupported || clusters.length === 1;
            if (!isOnPage('home') && !clusterSupported) {
              window.history.replaceState(null, null, '#/home');
              return Promise.resolve();
            }
          }

          return clusters;
        })
        .catch(ajaxErrorHandlers)
    );
  };
}
