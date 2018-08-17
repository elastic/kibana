/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { createGraphqlStateSelectors } from '../../../utils/remote_state/remote_graphql_state';
import { LogSummaryState, SummaryGraphqlState } from './state';

const summaryGraphlStateSelectors = createGraphqlStateSelectors<SummaryGraphqlState['data']>(
  (state: LogSummaryState) => state.summary
);

export const selectSummaryBuckets = createSelector(
  summaryGraphlStateSelectors.selectData,
  data => (data ? data.buckets : [])
);

export const selectSummaryIntervalSize = (state: LogSummaryState) => state.intervalSize;
