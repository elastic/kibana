/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { getDetailPanelReducer } from './detail_panel';
import { indices } from './indices';
import { rowStatus } from './row_status';
import { tableState } from './table_state';

export const getReducer = ({ uiMetricService }) =>
  combineReducers({
    indices,
    rowStatus,
    tableState,
    detailPanel: getDetailPanelReducer(uiMetricService),
  });
