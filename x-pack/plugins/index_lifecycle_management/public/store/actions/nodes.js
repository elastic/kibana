/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { createAction } from 'redux-actions';
import { showApiError } from '../../services/api_errors';
import { loadNodes, loadNodeDetails } from '../../services/api';
import { SET_SELECTED_NODE_ATTRS } from '../../constants';

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
    const title = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.nodeInfoErrorMessage',
      {
        defaultMessage: 'Error loading node attribute information',
      },
    );
    showApiError(err, title);
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
    const title = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.nodeDetailErrorMessage',
      {
        defaultMessage: 'Error loading node attribute details',
      },
    );
    showApiError(err, title);
    return false;
  }
  dispatch(fetchedNodeDetails(selectedNodeAttrs, details));
};
