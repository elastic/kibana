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
  setSelectedReplicaCount,
  fetchedNodeDetails,
} from '../actions/nodes';

const defaultState = {
  isLoading: false,
  selectedNodeAttrs: '',
  selectedPrimaryShardCount: 1,
  selectedReplicaCount: 1,
  nodes: undefined,
  details: {},
};

export const nodes = handleActions(
  {
    [fetchedNodes](state, { payload: nodes }) {
      return {
        ...state,
        isLoading: false,
        nodes,
      };
    },
    [fetchedNodeDetails](state, { payload }) {
      const { selectedNodeAttrs, details } = payload;
      return {
        ...state,
        details: {
          ...state.details,
          [selectedNodeAttrs]: details,
        },
      };
    },
    [setSelectedNodeAttrs](state, { payload: selectedNodeAttrs }) {
      return {
        ...state,
        selectedNodeAttrs,
      };
    },
    [setSelectedPrimaryShardCount](state, { payload }) {
      let selectedPrimaryShardCount = parseInt(payload);
      if (isNaN(selectedPrimaryShardCount)) {
        selectedPrimaryShardCount = '';
      }
      return {
        ...state,
        selectedPrimaryShardCount,
      };
    },
    [setSelectedReplicaCount](state, { payload }) {
      let selectedReplicaCount;
      if (payload != null) {
        selectedReplicaCount = parseInt(payload);
        if (isNaN(selectedReplicaCount)) {
          selectedReplicaCount = '';
        }
      } else {
        // default value for Elasticsearch
        selectedReplicaCount = 1;
      }

      return {
        ...state,
        selectedReplicaCount,
      };
    },
  },
  defaultState
);
