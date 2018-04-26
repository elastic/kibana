/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import * as rest from '../services/rest';
import { createActionTypes, createAction, createReducer } from './apiHelpers';
import { getCharts } from './selectors/chartSelectors';
import { getUrlParams } from './urlParams';

const actionTypes = createActionTypes('OVERVIEW_CHARTS');

const INITIAL_DATA = {
  totalHits: 0,
  dates: [],
  responseTimes: {},
  tpmBuckets: [],
  weightedAverage: null
};

export default createReducer(actionTypes, INITIAL_DATA);
export const loadOverviewCharts = createAction(actionTypes, rest.loadCharts);

export const getOverviewCharts = createSelector(
  getUrlParams,
  state => state.overviewCharts,
  getCharts
);
