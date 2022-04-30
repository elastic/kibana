/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, first } from 'lodash';
import { State } from '../application/contexts/global_state_context';

export function getClusterFromClusters(
  clusters: any,
  globalState: State,
  unsetGlobalState = false
) {
  const cluster = (() => {
    const existingCurrent = find(clusters, { cluster_uuid: globalState.cluster_uuid });
    if (existingCurrent) {
      return existingCurrent;
    }

    const firstCluster: any = first(clusters);
    if (firstCluster && firstCluster.cluster_uuid) {
      return firstCluster;
    }

    return null;
  })();

  if (cluster && cluster.license) {
    globalState.cluster_uuid = unsetGlobalState ? undefined : cluster.cluster_uuid;
    globalState.ccs = unsetGlobalState ? undefined : cluster.ccs;
    if (globalState.save) {
      globalState.save();
    }
    return cluster;
  }

  return null;
}
