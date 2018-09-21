/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { sourceSelectors, State } from '../store';
import { asChildFunctionRenderer } from '../utils/typed_react';

export const withSource = connect((state: State) => ({
  configuredFields: sourceSelectors.selectSourceFields(state),
  logIndicesExist: sourceSelectors.selectSourceLogIndicesExist(state),
  metricIndicesExist: sourceSelectors.selectSourceMetricIndicesExist(state),
}));

export const WithSource = asChildFunctionRenderer(withSource);
