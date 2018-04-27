/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { loadNodes } from '../../api';

export const setSelectedNodeAttrs = createAction('SET_SELECTED_NODE_ATTRS');
export const setSelectedPrimaryShardCount = createAction('SET_SELECTED_PRIMARY_SHARED_COUNT');
export const setSelectedReplicaCount = createAction('SET_SELECTED_REPLICA_COUNT');
export const fetchedNodes = createAction('FETCHED_NODES');
export const fetchNodes = () => async dispatch => {
  let nodes;
  try {
    nodes = await loadNodes();
  }
  catch (err) {
    return toastNotifications.addDanger(err.data.message);
  }

  dispatch(fetchedNodes(nodes));
};
