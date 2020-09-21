/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Prefer importing individual modules, e.g. import get from "lodash/get"
// eslint-disable-next-line no-restricted-imports
import _ from 'lodash';

export function getClusterFromClusters(clusters, globalState) {
  const cluster = (() => {
    const existingCurrent = _.find(clusters, { cluster_uuid: globalState.cluster_uuid });
    if (existingCurrent) {
      return existingCurrent;
    }

    const firstCluster = _.first(clusters);
    if (firstCluster && firstCluster.cluster_uuid) {
      return firstCluster;
    }

    return null;
  })();

  if (cluster && cluster.license) {
    globalState.cluster_uuid = cluster.cluster_uuid;
    globalState.ccs = cluster.ccs;
    globalState.save();
    return cluster;
  }

  return null;
}
