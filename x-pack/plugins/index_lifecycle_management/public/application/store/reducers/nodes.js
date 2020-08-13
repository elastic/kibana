/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { setSelectedPrimaryShardCount, setSelectedReplicaCount } from '../actions';

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
