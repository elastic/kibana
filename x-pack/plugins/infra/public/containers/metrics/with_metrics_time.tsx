/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { metricTimeActions, metricTimeSelectors, State } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { UrlStateContainer } from '../../utils/url_state';

export const withMetricsTime = connect(
  (state: State) => ({
    currentTimeRange: metricTimeSelectors.selectRangeTime(state),
    isAutoReloading: metricTimeSelectors.selectIsAutoReloading(state),
    urlState: selectTimeUrlState(state),
  }),
  bindPlainActionCreators({
    setRangeTime: metricTimeActions.setRangeTime,
    startAutoReload: metricTimeActions.startAutoReload,
    stopAutoReload: metricTimeActions.stopAutoReload,
  })
);

export const WithMetricsTime = asChildFunctionRenderer(withMetricsTime, {
  onCleanup: ({ stopAutoReload }) => stopAutoReload(),
});

/**
 * Url State
 */

interface MetricTimeUrlState {
  timeRange?: ReturnType<typeof metricTimeSelectors.selectRangeTime>;
  autoReload?: ReturnType<typeof metricTimeSelectors.selectIsAutoReloading>;
}

export const WithMetricsTimeUrlState = () => (
  <WithMetricsTime>
    {({ setRangeTime, startAutoReload, stopAutoReload, urlState }) => (
      <UrlStateContainer
        urlState={urlState}
        urlStateKey="metricTime"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.timeRange) {
            setRangeTime(newUrlState.timeRange);
          }
          if (newUrlState && newUrlState.autoReload) {
            startAutoReload();
          } else if (
            newUrlState &&
            typeof newUrlState.autoReload !== 'undefined' &&
            !newUrlState.autoReload
          ) {
            stopAutoReload();
          }
        }}
        onInitialize={initialUrlState => {
          if (initialUrlState && initialUrlState.timeRange) {
            setRangeTime(initialUrlState.timeRange);
          }
          if (initialUrlState && initialUrlState.autoReload) {
            startAutoReload();
          }
        }}
      />
    )}
  </WithMetricsTime>
);

const selectTimeUrlState = createSelector(
  metricTimeSelectors.selectRangeTime,
  metricTimeSelectors.selectIsAutoReloading,
  (time, autoReload) => ({
    time,
    autoReload,
  })
);

const mapToUrlState = (value: any): MetricTimeUrlState | undefined =>
  value
    ? {
        timeRange: mapToTimeUrlState(value.timeRange),
        autoReload: mapToAutoReloadUrlState(value.autoReload),
      }
    : undefined;

const mapToTimeUrlState = (value: any) =>
  value && (typeof value.to === 'number' && typeof value.from === 'number') ? value : undefined;

const mapToAutoReloadUrlState = (value: any) => (typeof value === 'boolean' ? value : undefined);
