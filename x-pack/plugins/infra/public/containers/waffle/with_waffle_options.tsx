/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { State, waffleOptionsActions, waffleOptionsSelectors } from '../../store';
import { initialWaffleOptionsState } from '../../store/local/waffle_options/reducer';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { UrlStateContainer } from '../../utils/url_state';

export const withWaffleOptions = connect(
  (state: State) => ({
    metrics: waffleOptionsSelectors.selectMetrics(state),
    urlState: { metrics: waffleOptionsSelectors.selectMetrics(state) },
  }),
  bindPlainActionCreators({
    changeMetrics: waffleOptionsActions.changeMetrics,
  })
);

export const WithWaffleOptions = asChildFunctionRenderer(withWaffleOptions);

/**
 * Url State
 */

interface WaffleOptionsUrlState {
  metrics?: ReturnType<typeof waffleOptionsSelectors.selectMetrics>;
}

export const WithWaffleMetricsUrlState = () => (
  <WithWaffleOptions>
    {({ changeMetrics, urlState }) => (
      <UrlStateContainer
        urlState={urlState}
        urlStateKey="waffleOptions"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.metrics) {
            changeMetrics(newUrlState.metrics);
          }
        }}
        onInitialize={initialUrlState => {
          if (initialUrlState) {
            changeMetrics(initialUrlState.metrics || initialWaffleOptionsState.metrics);
          }
        }}
      />
    )}
  </WithWaffleOptions>
);

const mapToUrlState = (value: any): WaffleOptionsUrlState | undefined =>
  value
    ? {
        metrics: mapToMetricsUrlState(value.metrics),
      }
    : undefined;

const mapToMetricsUrlState = (value: any) => (value && Array.isArray(value) ? value : undefined);
