/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bindActionCreators } from 'redux';
import { store } from './store';

import { anomalyExplorerActions } from './modules/anomaly_explorer';
import { dragSelectActions } from './modules/drag_select';
import { showChartsActions } from './modules/show_charts';

export const dispatch = bindActionCreators({
  ...anomalyExplorerActions,
  ...dragSelectActions,
  ...showChartsActions
}, store.dispatch);
