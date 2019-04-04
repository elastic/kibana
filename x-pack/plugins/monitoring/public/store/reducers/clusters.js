/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { fetchedClusters, fetchedCluster, setActiveClusterUuid, setCcs } from '../actions';

const defaultState = {
  clusters: null,
  activeClusterUuid: null,
  ccs: false,
};

export const clusters = handleActions(
  {
    [fetchedClusters](state, action) {
      const { clusters } = action.payload;
      return {
        ...state,
        clusters,
      };
    },
    [fetchedCluster](state, action) {
      const { cluster } = action.payload;
      return {
        ...state,
        clusters: state.clusters.map(_cluster => {
          if (_cluster.cluster_uuid === cluster.cluster_uuid) {
            return cluster;
          }
          return _cluster;
        })
      };
    },
    [setActiveClusterUuid](state, action) {
      const { clusterUuid } = action.payload;
      return {
        ...state,
        activeClusterUuid: clusterUuid,
      };
    },
    [setCcs](state, action) {
      const { ccs } = action.payload;
      return {
        ...state,
        ccs,
      };
    },
  },
  defaultState
);
