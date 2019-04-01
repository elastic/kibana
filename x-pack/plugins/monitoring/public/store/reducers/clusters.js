/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { fetchedClusters } from '../actions';

const defaultState = {
  clusters: [],
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
  },
  defaultState
);
