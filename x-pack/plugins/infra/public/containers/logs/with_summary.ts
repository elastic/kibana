/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { logSummaryActions, logSummarySelectors, State } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withSummary = connect(
  (state: State) => ({
    buckets: logSummarySelectors.selectSummaryBuckets(state),
  }),
  bindPlainActionCreators({
    load: logSummaryActions.loadSummary,
  })
);

export const WithSummary = asChildFunctionRenderer(withSummary);
