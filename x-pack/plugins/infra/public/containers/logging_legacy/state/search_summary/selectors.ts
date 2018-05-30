/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import keyBy from 'lodash/fp/keyBy';
import { createSelector } from 'reselect';

import { SearchSummaryState } from './reducer';

export const selectBuckets = (state: SearchSummaryState) => state.buckets;

export const selectBucketsByStart = createSelector(
  selectBuckets,
  summaryBuckets => keyBy('start', summaryBuckets)
);
