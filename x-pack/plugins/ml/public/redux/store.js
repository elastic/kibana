/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import {
  combineReducers,
  compose,
  createStore,
  applyMiddleware
} from 'redux';

import { anomalyExplorerReducer } from './modules/anomaly_explorer';
import { showChartsReducer } from './modules/show_charts';

const mainReducer = combineReducers({
  anomalyExplorer: anomalyExplorerReducer,
  showCharts: showChartsReducer
});

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const store = createStore(
  mainReducer,
  composeEnhancers(applyMiddleware())
);
