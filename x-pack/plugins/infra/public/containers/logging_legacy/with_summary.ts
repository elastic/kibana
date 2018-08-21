/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { State, summaryActions, summarySelectors } from './state';

export const withSummary = connect(
  (state: State) => ({
    availableIntervalSizes,
    buckets: summarySelectors.selectSummaryBuckets(state),
    intervalSize: summarySelectors.selectSummaryIntervalSize(state),
  }),
  bindPlainActionCreators({
    configureSummary: summaryActions.configureSummary,
    reportVisibleInterval: summaryActions.reportVisibleSummary,
  })
);

export const WithSummary = asChildFunctionRenderer(withSummary);

export const availableIntervalSizes = [
  {
    label: '1 Year',
    intervalSize: 1000 * 60 * 60 * 24 * 365,
  },
  {
    label: '1 Month',
    intervalSize: 1000 * 60 * 60 * 24 * 30,
  },
  {
    label: '1 Week',
    intervalSize: 1000 * 60 * 60 * 24 * 7,
  },
  {
    label: '1 Day',
    intervalSize: 1000 * 60 * 60 * 24,
  },
  {
    label: '1 Hour',
    intervalSize: 1000 * 60 * 60,
  },
  {
    label: '1 Minute',
    intervalSize: 1000 * 60,
  },
];
