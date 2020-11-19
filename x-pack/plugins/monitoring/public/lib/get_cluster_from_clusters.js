/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find, first } from 'lodash';

export function getClusterFromClusters(clusters, globalState, unsetGlobalState = false) {
  const cluster = (() => {
    const existingCurrent = find(clusters, { cluster_uuid: globalState.cluster_uuid });
    if (existingCurrent) {
      return existingCurrent;
    }

    const firstCluster = first(clusters);
    if (firstCluster && firstCluster.cluster_uuid) {
      return firstCluster;
    }

    return null;
  })();

  if (cluster && cluster.license) {
    globalState.cluster_uuid = unsetGlobalState ? undefined : cluster.cluster_uuid;
    globalState.ccs = unsetGlobalState ? undefined : cluster.ccs;
    globalState.save();
    return cluster;
  }

  return null;
}
