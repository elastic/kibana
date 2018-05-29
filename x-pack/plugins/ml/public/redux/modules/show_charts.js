/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const SHOW_CHARTS = 'SHOW_CHARTS';

export const showChartsActions = {
  showCharts: (visible) => ({ type: SHOW_CHARTS, visible })
};

const defaultState = true;

export const showChartsReducer = (state = defaultState, action) => {
  switch (action.type) {
    case SHOW_CHARTS:
      return action.visible;

    default:
      return state;
  }
};
