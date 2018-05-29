/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const SHOW_CHARTS = 'SHOW_CHARTS';

export const aShowCharts = (showCharts) => ({ type: SHOW_CHARTS, showCharts });

const defaultState = true;

export const showChartsReducer = (state = defaultState, action) => {
  switch (action.type) {
    case SHOW_CHARTS:
      return action.showCharts;

    default:
      return state;
  }
};
