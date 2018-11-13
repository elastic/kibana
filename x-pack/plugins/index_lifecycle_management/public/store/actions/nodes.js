/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { loadNodes, loadNodeDetails } from '../../api';
import { SET_SELECTED_NODE_ATTRS } from '../constants';

export const setSelectedNodeAttrs = createAction(SET_SELECTED_NODE_ATTRS);
export const setSelectedPrimaryShardCount = createAction(
  'SET_SELECTED_PRIMARY_SHARED_COUNT'
);
export const setSelectedReplicaCount = createAction(
  'SET_SELECTED_REPLICA_COUNT'
);
export const fetchedNodes = createAction('FETCHED_NODES');
let fetchingNodes = false;
export const fetchNodes = () => async dispatch => {
  try {
    if (!fetchingNodes) {
      fetchingNodes = true;
      const nodes = await loadNodes();
      dispatch(fetchedNodes(nodes));
    }
  } catch (err) {
    return toastNotifications.addDanger(err.data.message);
  } finally {
    fetchingNodes = false;
  }
};

export const fetchedNodeDetails = createAction(
  'FETCHED_NODE_DETAILS',
  (selectedNodeAttrs, details) => ({
    selectedNodeAttrs,
    details,
  })
);
export const fetchNodeDetails = selectedNodeAttrs => async dispatch => {
  let details;
  try {
    details = await loadNodeDetails(selectedNodeAttrs);
  } catch (err) {
    return toastNotifications.addDanger(err.data.message);
  }

  dispatch(fetchedNodeDetails(selectedNodeAttrs, details));
};
