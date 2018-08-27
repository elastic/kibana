/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { logFilterActions, logFilterSelectors, State } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withLogFilter = connect(
  (state: State) => ({
    filterQuery: logFilterSelectors.selectLogFilterQuery(state),
    isFilterQueryValid: logFilterSelectors.selectIsLogFilterQueryValid(state),
  }),
  bindPlainActionCreators({
    applyFilterQuery: logFilterActions.applyLogFilterQuery,
    applyFilterQueryFromKueryExpression: (expression: string) =>
      logFilterActions.applyLogFilterQuery({
        kind: 'kuery',
        expression,
      }),
    setFilterQuery: logFilterActions.setLogFilterQuery,
    setFilterQueryFromKueryExpression: (expression: string) =>
      logFilterActions.setLogFilterQuery({
        kind: 'kuery',
        expression,
      }),
  })
);

export const WithLogFilter = asChildFunctionRenderer(withLogFilter);
