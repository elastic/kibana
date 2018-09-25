/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { State, waffleMetricsActions, waffleMetricsSelectors } from '../../store';
import { initialWaffleMetricsState } from '../../store/local/waffle_metrics/reducer';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { UrlStateContainer } from '../../utils/url_state';

export const withWaffleMetrics = connect(
  (state: State) => ({
    metrics: waffleMetricsSelectors.selectMetrics(state),
    urlState: { metrics: waffleMetricsSelectors.selectMetrics(state) },
  }),
  bindPlainActionCreators({
    changeMetrics: waffleMetricsActions.changeMetrics,
  })
);

export const WithWaffleMetrics = asChildFunctionRenderer(withWaffleMetrics);

/**
 * Url State
 */

interface WaffleTimeUrlState {
  metrics?: ReturnType<typeof waffleMetricsSelectors.selectMetrics>;
}

export const WithWaffleTimeUrlState = () => (
  <WithWaffleMetrics>
    {({ changeMetrics, urlState }) => (
      <UrlStateContainer
        urlState={urlState}
        urlStateKey="waffleMetrics"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.metrics) {
            changeMetrics(newUrlState.metrics);
          }
        }}
        onInitialize={initialUrlState => {
          if (initialUrlState) {
            changeMetrics(
              initialUrlState.metrics ? initialUrlState.metrics : initialWaffleMetricsState.metrics
            );
          }
        }}
      />
    )}
  </WithWaffleMetrics>
);

const mapToUrlState = (value: any): WaffleTimeUrlState | undefined =>
  value
    ? {
        metrics: mapToMetricsUrlState(value.metrics),
      }
    : undefined;

const mapToMetricsUrlState = (value: any) => (value && Array.isArray(value) ? value : undefined);
