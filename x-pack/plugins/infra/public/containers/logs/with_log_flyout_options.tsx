/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { isBoolean, isString } from 'lodash';
import { flyoutOptionsActions, flyoutOptionsSelecctors, State } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { UrlStateContainer } from '../../utils/url_state';

const selectOptionsUrlState = createSelector(
  flyoutOptionsSelecctors.selectFlyoutId,
  flyoutOptionsSelecctors.selectFlyoutVisibility,
  (flyoutId, isFlyoutVisible) => ({
    isFlyoutVisible,
    flyoutId,
  })
);

export const withFlyoutOptions = connect(
  (state: State) => ({
    isFlyoutVisible: flyoutOptionsSelecctors.selectFlyoutVisibility(state),
    flyoutId: flyoutOptionsSelecctors.selectFlyoutId(state),
    urlState: selectOptionsUrlState(state),
  }),
  bindPlainActionCreators({
    setFlyoutItem: flyoutOptionsActions.setFlyoutItem,
    showFlyout: flyoutOptionsActions.showFlyout,
  })
);

export const WithFlyoutOptions = asChildFunctionRenderer(withFlyoutOptions);

/**
 * Url State
 */

interface FlyoutOptionsUrlState {
  flyoutId?: ReturnType<typeof flyoutOptionsSelecctors.selectFlyoutId>;
  isFlyoutVisible?: ReturnType<typeof flyoutOptionsSelecctors.selectFlyoutVisibility>;
}

export const WithFlyoutOptionsUrlState = () => (
  <WithFlyoutOptions>
    {({ setFlyoutItem, showFlyout, urlState }) => (
      <UrlStateContainer
        urlState={urlState}
        urlStateKey="flyoutOptions"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.flyoutId) {
            setFlyoutItem(newUrlState.flyoutId);
          }
          if (newUrlState && newUrlState.isFlyoutVisible) {
            showFlyout(newUrlState.isFlyoutVisible);
          }
        }}
        onInitialize={initialUrlState => {
          if (initialUrlState && initialUrlState.flyoutId) {
            setFlyoutItem(initialUrlState.flyoutId);
          }
          if (initialUrlState && initialUrlState.isFlyoutVisible) {
            showFlyout(initialUrlState.isFlyoutVisible);
          }
        }}
      />
    )}
  </WithFlyoutOptions>
);

const mapToUrlState = (value: any): FlyoutOptionsUrlState | undefined =>
  value
    ? {
        flyoutId: mapToFlyoutIdState(value.flyoutId),
        isFlyoutVisible: mapToFlyoutVisibilityState(value.isFlyoutVisible),
      }
    : undefined;

const mapToFlyoutIdState = (subject: any) => {
  return subject && isString(subject) ? subject : undefined;
};
const mapToFlyoutVisibilityState = (subject: any) => {
  return subject && isBoolean(subject) ? subject : undefined;
};
