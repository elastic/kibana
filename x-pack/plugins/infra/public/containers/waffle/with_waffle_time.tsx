/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { State, waffleTimeActions, waffleTimeSelectors } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { UrlStateContainer } from '../../utils/url_state';

export const withWaffleTime = connect(
  (state: State) => ({
    currentTime: waffleTimeSelectors.selectCurrentTime(state),
    currentTimeRange: waffleTimeSelectors.selectCurrentTimeRange(state),
    isAutoReloading: waffleTimeSelectors.selectIsAutoReloading(state),
    urlState: selectTimeUrlState(state),
  }),
  bindPlainActionCreators({
    jumpToTime: waffleTimeActions.jumpToTime,
    startAutoReload: waffleTimeActions.startAutoReload,
    stopAutoReload: waffleTimeActions.stopAutoReload,
  })
);

export const WithWaffleTime = asChildFunctionRenderer(withWaffleTime, {
  onCleanup: ({ stopAutoReload }) => stopAutoReload(),
});

/**
 * Url State
 */

interface WaffleTimeUrlState {
  time?: ReturnType<typeof waffleTimeSelectors.selectCurrentTime>;
  autoReload?: ReturnType<typeof waffleTimeSelectors.selectIsAutoReloading>;
}

export const WithWaffleTimeUrlState = () => (
  <WithWaffleTime>
    {({ jumpToTime, startAutoReload, stopAutoReload, urlState }) => (
      <UrlStateContainer
        urlState={urlState}
        urlStateKey="waffleTime"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.time) {
            jumpToTime(newUrlState.time);
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
          if (initialUrlState) {
            jumpToTime(initialUrlState.time ? initialUrlState.time : Date.now());
          }
          if (initialUrlState && initialUrlState.autoReload) {
            startAutoReload();
          }
        }}
      />
    )}
  </WithWaffleTime>
);

const selectTimeUrlState = createSelector(
  waffleTimeSelectors.selectCurrentTime,
  waffleTimeSelectors.selectIsAutoReloading,
  (time, autoReload) => ({
    time,
    autoReload,
  })
);

const mapToUrlState = (value: any): WaffleTimeUrlState | undefined =>
  value
    ? {
        time: mapToTimeUrlState(value.time),
        autoReload: mapToAutoReloadUrlState(value.autoReload),
      }
    : undefined;

const mapToTimeUrlState = (value: any) => (value && typeof value === 'number' ? value : undefined);

const mapToAutoReloadUrlState = (value: any) => (typeof value === 'boolean' ? value : undefined);
