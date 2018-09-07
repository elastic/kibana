/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { sharedSelectors, State, waffleFilterActions, waffleFilterSelectors } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';

export const withWaffleFilter = connect(
  (state: State) => ({
    filterQuery: waffleFilterSelectors.selectWaffleFilterQuery(state),
    filterQueryDraft: waffleFilterSelectors.selectWaffleFilterQueryDraft(state),
    filterQueryAsJson: sharedSelectors.selectWaffleFilterQueryAsJson(state),
    isFilterQueryDraftValid: waffleFilterSelectors.selectIsWaffleFilterQueryDraftValid(state),
  }),
  bindPlainActionCreators({
    applyFilterQuery: waffleFilterActions.applyWaffleFilterQuery,
    applyFilterQueryFromKueryExpression: (expression: string) =>
      waffleFilterActions.applyWaffleFilterQuery({
        kind: 'kuery',
        expression,
      }),
    restoreFromUrl: waffleFilterActions.restoreFromUrl,
    setFilterQueryDraft: waffleFilterActions.setWaffleFilterQueryDraft,
    setFilterQueryDraftFromKueryExpression: (expression: string) =>
      waffleFilterActions.setWaffleFilterQueryDraft({
        kind: 'kuery',
        expression,
      }),
  })
);

export const WithWaffleFilter = asChildFunctionRenderer(withWaffleFilter, {
  onInitialize: ({ restoreFromUrl }) => restoreFromUrl(),
});
