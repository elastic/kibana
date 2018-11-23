/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { logMinimapActions, logMinimapSelectors, State } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { UrlStateContainer } from '../../utils/url_state';

export const withLogMinimap = connect(
  (state: State) => ({
    availableIntervalSizes,
    intervalSize: logMinimapSelectors.selectMinimapIntervalSize(state),
    urlState: selectMinimapUrlState(state),
  }),
  bindPlainActionCreators({
    setIntervalSize: logMinimapActions.setMinimapIntervalSize,
  })
);

export const WithLogMinimap = asChildFunctionRenderer(withLogMinimap);

export const availableIntervalSizes = [
  {
    label: '1 Year',
    intervalSize: 1000 * 60 * 60 * 24 * 365,
  },
  {
    label: '1 Month',
    intervalSize: 1000 * 60 * 60 * 24 * 30,
  },
  {
    label: '1 Week',
    intervalSize: 1000 * 60 * 60 * 24 * 7,
  },
  {
    label: '1 Day',
    intervalSize: 1000 * 60 * 60 * 24,
  },
  {
    label: '1 Hour',
    intervalSize: 1000 * 60 * 60,
  },
  {
    label: '1 Minute',
    intervalSize: 1000 * 60,
  },
];

/**
 * Url State
 */

interface LogMinimapUrlState {
  intervalSize?: ReturnType<typeof logMinimapSelectors.selectMinimapIntervalSize>;
}

export const WithLogMinimapUrlState = () => (
  <WithLogMinimap>
    {({ urlState, setIntervalSize }) => (
      <UrlStateContainer
        urlState={urlState}
        urlStateKey="logMinimap"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.intervalSize) {
            setIntervalSize(newUrlState.intervalSize);
          }
        }}
        onInitialize={newUrlState => {
          if (newUrlState && newUrlState.intervalSize) {
            setIntervalSize(newUrlState.intervalSize);
          }
        }}
      />
    )}
  </WithLogMinimap>
);

const mapToUrlState = (value: any): LogMinimapUrlState | undefined =>
  value
    ? {
        intervalSize: mapToIntervalSizeUrlState(value.intervalSize),
      }
    : undefined;

const mapToIntervalSizeUrlState = (value: any) =>
  value && typeof value === 'number' ? value : undefined;

const selectMinimapUrlState = createSelector(
  logMinimapSelectors.selectMinimapIntervalSize,
  intervalSize => ({
    intervalSize,
  })
);
