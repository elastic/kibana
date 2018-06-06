/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createActions } from '../util';

const { actionTypes, actions } = createActions(['SHOW_CHARTS']);

export const showChartsActions = actions;

export const showChartsReducer = (state = true, action) => {
  switch (action.type) {
    case actionTypes.SHOW_CHARTS:
      return action.payload;

    default:
      return state;
  }
};
