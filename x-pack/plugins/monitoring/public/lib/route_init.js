/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';

export function routeInitProvider(Private, monitoringClusters, globalState, license, kbnUrl) {
  const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);

  function isOnPage(hash) {
    return _.contains(window.location.hash, hash);
  }

  /*
   * returns true if:
   * license is not basic or
   * the data just has a single cluster or
   * all the clusters are basic and this is the primary cluster
   */
  return function routeInit() {
    return monitoringClusters()
    // Set the clusters collection and current cluster in globalState
      .then((clusters) => {
        const cluster = (() => {
          const existingCurrent = _.find(clusters, { cluster_uuid: globalState.cluster_uuid });
          if (existingCurrent) { return existingCurrent; }

          const firstCluster = _.first(clusters);
          if (firstCluster && firstCluster.cluster_uuid) { return firstCluster; }

          return null;
        })();

        if (cluster && cluster.license) {
          globalState.cluster_uuid = cluster.cluster_uuid;
          globalState.ccs = cluster.ccs;
          globalState.save();
        } else {
          return kbnUrl.redirect('/no-data');
        }

        license.setLicense(cluster.license);

        // check if we need to redirect because of license problems
        if (!(isOnPage('license') || isOnPage('home')) && license.isExpired()) {
          return kbnUrl.redirect('/license');
        }

        // check if we need to redirect because of attempt at unsupported multi-cluster monitoring
        if (!isOnPage('home') && !cluster.isSupported) {
          return kbnUrl.redirect('/home');
        }

        return clusters;
      })
      .catch(ajaxErrorHandlers);
  };
}
