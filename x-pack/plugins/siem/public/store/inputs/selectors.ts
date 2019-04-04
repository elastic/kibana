/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { State } from '../reducer';

import { GlobalQuery, Policy, TimeRange } from './model';

const selectGlobalTimeRange = (state: State): TimeRange => state.inputs.global.timerange;
const selectGlobalPolicy = (state: State): Policy => state.inputs.global.policy;
const selectGlobalQuery = (state: State): GlobalQuery[] => state.inputs.global.query;

export const globalTimeRangeSelector = createSelector(
  selectGlobalTimeRange,
  timerange => timerange
);

export const globalPolicySelector = createSelector(
  selectGlobalPolicy,
  policy => policy
);

export const globalQuery = createSelector(
  selectGlobalQuery,
  query => query
);
