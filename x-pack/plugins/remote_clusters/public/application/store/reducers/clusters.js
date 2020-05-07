/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LOAD_CLUSTERS_START,
  LOAD_CLUSTERS_SUCCESS,
  LOAD_CLUSTERS_FAILURE,
  REFRESH_CLUSTERS_SUCCESS,
  REMOVE_CLUSTERS_FINISH,
} from '../action_types';

const initialState = {
  isLoading: false,
  clusterLoadError: null,
  asList: [],
  byName: {},
  allNames: [],
};

// Convert an  Array of clusters to an object where
// each key is the cluster name
const mapClustersToNames = clusters =>
  clusters.reduce(
    (byName, cluster) => ({
      ...byName,
      [cluster.name]: cluster,
    }),
    {}
  );

const getClustersNames = clusters => clusters.map(cluster => cluster.name);

export function clusters(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case LOAD_CLUSTERS_START:
      return {
        ...state,
        isLoading: true,
      };

    case LOAD_CLUSTERS_SUCCESS:
      return {
        asList: [...payload.clusters],
        byName: mapClustersToNames(payload.clusters),
        allNames: getClustersNames(payload.clusters),
        isLoading: false,
      };

    case REFRESH_CLUSTERS_SUCCESS:
      return {
        asList: [...payload.clusters],
        byName: mapClustersToNames(payload.clusters),
        allNames: getClustersNames(payload.clusters),
      };

    case LOAD_CLUSTERS_FAILURE:
      return {
        ...state,
        isLoading: false,
        clusterLoadError: payload.error,
      };

    case REMOVE_CLUSTERS_FINISH:
      const clustersRemoved = payload;

      const updatedList = Object.keys(state.byName)
        .filter(name => clustersRemoved.indexOf(name) < 0)
        .map(name => state.byName[name]);

      return {
        ...state,
        asList: updatedList,
        byName: mapClustersToNames(updatedList),
        allNames: getClustersNames(updatedList),
      };

    default:
      return state;
  }
}
