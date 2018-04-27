/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import {
  fetchedNodes,
  setSelectedNodeAttrs,
  setSelectedPrimaryShardCount,
  setSelectedReplicaCount
} from '../actions/nodes';

const defaultState = {
  isLoading: false,
  selectedNodeAttrs: '',
  selectedPrimaryShardCount: 1,
  selectedReplicaCount: 1,
  nodes: []
};

export const nodes = handleActions(
  {
    [fetchedNodes](state, { payload: nodes }) {
      return {
        ...state,
        isLoading: false,
        nodes
      };
    },
    [setSelectedNodeAttrs](state, { payload: selectedNodeAttrs }) {
      return {
        ...state,
        selectedNodeAttrs
      };
    },
    [setSelectedPrimaryShardCount](state, { payload }) {
      let selectedPrimaryShardCount = parseInt(payload);
      if (isNaN(selectedPrimaryShardCount)) {
        selectedPrimaryShardCount = '';
      }
      return {
        ...state,
        selectedPrimaryShardCount
      };
    },
    [setSelectedReplicaCount](state, { payload }) {
      let selectedReplicaCount = parseInt(payload);
      if (isNaN(selectedReplicaCount)) {
        selectedReplicaCount = '';
      }

      return {
        ...state,
        selectedReplicaCount
      };
    }
  },
  defaultState
);
