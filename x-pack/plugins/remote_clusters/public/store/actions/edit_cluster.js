/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EDIT_CLUSTER_START,
  EDIT_CLUSTER_STOP,
} from '../action_types';

import { loadClusters } from './load_clusters';

export const startEditingCluster = ({ clusterName }) => (dispatch) => {
  dispatch(loadClusters());

  dispatch({
    type: EDIT_CLUSTER_START,
    payload: { clusterName },
  });
};

export const stopEditingCluster = () => (dispatch) => {
  // Load the clusters to refresh the one we just edited.
  dispatch(loadClusters());

  dispatch({
    type: EDIT_CLUSTER_STOP,
  });
};
