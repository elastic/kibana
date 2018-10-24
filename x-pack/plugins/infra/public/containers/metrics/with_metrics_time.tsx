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
    startMetricsAutoReload: metricTimeActions.startMetricsAutoReload,
    stopMetricsAutoReload: metricTimeActions.stopMetricsAutoReload,
  })
);

export const WithMetricsTime = asChildFunctionRenderer(withMetricsTime, {
  onCleanup: ({ stopMetricsAutoReload }) => stopMetricsAutoReload(),
});

/**
 * Url State
 */

interface MetricTimeUrlState {
  time?: ReturnType<typeof metricTimeSelectors.selectRangeTime>;
  autoReload?: ReturnType<typeof metricTimeSelectors.selectIsAutoReloading>;
}

export const WithMetricsTimeUrlState = () => (
  <WithMetricsTime>
    {({ setRangeTime, startMetricsAutoReload, stopMetricsAutoReload, urlState }) => (
      <UrlStateContainer
        urlState={urlState}
        urlStateKey="metricTime"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.time) {
            setRangeTime(newUrlState.time);
          }
          if (newUrlState && newUrlState.autoReload) {
            startMetricsAutoReload();
          } else if (
            newUrlState &&
            typeof newUrlState.autoReload !== 'undefined' &&
            !newUrlState.autoReload
          ) {
            stopMetricsAutoReload();
          }
        }}
        onInitialize={initialUrlState => {
          if (initialUrlState && initialUrlState.time) {
            setRangeTime(initialUrlState.time);
          }
          if (initialUrlState && initialUrlState.autoReload) {
            startMetricsAutoReload();
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
        time: mapToTimeUrlState(value.time),
        autoReload: mapToAutoReloadUrlState(value.autoReload),
      }
    : undefined;

const mapToTimeUrlState = (value: any) =>
  value && (typeof value.to === 'number' && typeof value.from === 'number') ? value : undefined;

const mapToAutoReloadUrlState = (value: any) => (typeof value === 'boolean' ? value : undefined);
