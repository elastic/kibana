/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';

import { sharedSelectors, State, waffleFilterActions, waffleFilterSelectors } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { UrlStateContainer } from '../../utils/url_state';

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
    setFilterQueryDraft: waffleFilterActions.setWaffleFilterQueryDraft,
    setFilterQueryDraftFromKueryExpression: (expression: string) =>
      waffleFilterActions.setWaffleFilterQueryDraft({
        kind: 'kuery',
        expression,
      }),
  })
);

export const WithWaffleFilter = asChildFunctionRenderer(withWaffleFilter);

/**
 * Url State
 */

type WaffleFilterUrlState = ReturnType<typeof waffleFilterSelectors.selectWaffleFilterQuery>;

export const WithWaffleFilterUrlState = () => (
  <WithWaffleFilter>
    {({ applyFilterQuery, filterQuery }) => (
      <UrlStateContainer
        urlState={filterQuery}
        urlStateKey="waffleFilter"
        mapToUrlState={mapToUrlState}
        onChange={urlState => {
          if (urlState) {
            applyFilterQuery(urlState);
          }
        }}
        onInitialize={urlState => {
          if (urlState) {
            applyFilterQuery(urlState);
          }
        }}
      />
    )}
  </WithWaffleFilter>
);

const mapToUrlState = (value: any): WaffleFilterUrlState | undefined =>
  value && value.kind === 'kuery' && typeof value.expression === 'string'
    ? {
        kind: value.kind,
        expression: value.expression,
      }
    : undefined;
