/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bindActionCreators } from 'redux';
import { store } from './store';

import { anomalyExplorerActions } from './modules/anomaly_explorer';
import { showChartsActions } from './modules/show_charts';

export const {
  dragSelectUpdate,
  dragSelectFinish,
  loadingStart,
  loadingStop,
  anomalyDataChange,
  timeRangeChange
} = bindActionCreators(anomalyExplorerActions, store.dispatch);

export const {
  showCharts
} = bindActionCreators(showChartsActions, store.dispatch);
