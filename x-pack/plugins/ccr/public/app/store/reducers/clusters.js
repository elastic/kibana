/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Temp disable eslint...

/* eslint-disable */

import * as t from '../action_types';

const initialState = {
  byId: {},
  selectedId: null,
};

// Reducers

const loadSuccess = (state, action) => state;

const createSuccess = (state, action) => state;

const updateSuccess = (state, action) => state;


// ----------

const actionToReducerMap = {
  [t.CLUSTERS_LOAD_SUCCESS]: loadSuccess,
  [t.CLUSTERS_LOAD_SUCCESS]: createSuccess,
  [t.CLUSTER_UPDATE_SUCCESS]: updateSuccess,
};

const reducer = (state = initialState, action) => {
  if (actionToReducerMap[action.type]) {
    return actionToReducerMap[action.type](state, action);
  }
  return state;
};

export default reducer;
