/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';

import { logFilterActions, logFilterSelectors, State } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { replaceStateKeyInQueryString, UrlStateContainer } from '../../utils/url_state';

const withLogFilter = connect(
  (state: State) => ({
    filterQuery: logFilterSelectors.selectLogFilterQuery(state),
    filterQueryDraft: logFilterSelectors.selectLogFilterQueryDraft(state),
    isFilterQueryDraftValid: logFilterSelectors.selectIsLogFilterQueryDraftValid(state),
  }),
  bindPlainActionCreators({
    applyFilterQuery: logFilterActions.applyLogFilterQuery,
    applyFilterQueryFromKueryExpression: (expression: string) =>
      logFilterActions.applyLogFilterQuery({
        kind: 'kuery',
        expression,
      }),
    setFilterQueryDraft: logFilterActions.setLogFilterQueryDraft,
    setFilterQueryDraftFromKueryExpression: (expression: string) =>
      logFilterActions.setLogFilterQueryDraft({
        kind: 'kuery',
        expression,
      }),
  })
);

export const WithLogFilter = asChildFunctionRenderer(withLogFilter);

/**
 * Url State
 */

type LogFilterUrlState = ReturnType<typeof logFilterSelectors.selectLogFilterQuery>;

export const WithLogFilterUrlState = () => (
  <WithLogFilter>
    {({ applyFilterQuery, filterQuery }) => (
      <UrlStateContainer
        urlState={filterQuery}
        urlStateKey="logFilter"
        mapToUrlState={mapToFilterQuery}
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
  </WithLogFilter>
);

const mapToFilterQuery = (value: any): LogFilterUrlState | undefined =>
  value && value.kind === 'kuery' && typeof value.expression === 'string'
    ? {
        kind: value.kind,
        expression: value.expression,
      }
    : undefined;

export const replaceLogFilterInQueryString = (expression: string) =>
  replaceStateKeyInQueryString<LogFilterUrlState>('logFilter', {
    kind: 'kuery',
    expression,
  });
