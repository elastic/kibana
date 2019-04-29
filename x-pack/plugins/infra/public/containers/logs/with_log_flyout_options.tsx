/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { isString } from 'lodash';
import { flyoutOptionsActions, flyoutOptionsSelectors, State } from '../../store';
import { FlyoutVisibility } from '../../store/local/log_flyout';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { UrlStateContainer } from '../../utils/url_state';

const selectOptionsUrlState = createSelector(
  flyoutOptionsSelectors.selectFlyoutId,
  flyoutOptionsSelectors.selectFlyoutVisibility,
  (flyoutId, flyoutVisibility) => ({
    flyoutVisibility,
    flyoutId,
  })
);

export const withFlyoutOptions = connect(
  (state: State) => ({
    flyoutVisibility: flyoutOptionsSelectors.selectFlyoutVisibility(state),
    flyoutId: flyoutOptionsSelectors.selectFlyoutId(state),
    urlState: selectOptionsUrlState(state),
  }),
  bindPlainActionCreators({
    setFlyoutItem: flyoutOptionsActions.setFlyoutItem,
    showFlyout: flyoutOptionsActions.showFlyout,
    hideFlyout: flyoutOptionsActions.hideFlyout,
  })
);

export const WithFlyoutOptions = asChildFunctionRenderer(withFlyoutOptions);

/**
 * Url State
 */

interface FlyoutOptionsUrlState {
  flyoutId?: ReturnType<typeof flyoutOptionsSelectors.selectFlyoutId>;
  flyoutVisibility?: ReturnType<typeof flyoutOptionsSelectors.selectFlyoutVisibility>;
}

export const WithFlyoutOptionsUrlState = () => (
  <WithFlyoutOptions>
    {({ setFlyoutItem, showFlyout, hideFlyout, urlState }) => (
      <UrlStateContainer
        urlState={urlState}
        urlStateKey="flyoutOptions"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.flyoutId) {
            setFlyoutItem(newUrlState.flyoutId);
          }
          if (newUrlState && newUrlState.flyoutVisibility === FlyoutVisibility.visible) {
            showFlyout();
          }
          if (newUrlState && newUrlState.flyoutVisibility === FlyoutVisibility.hidden) {
            hideFlyout();
          }
        }}
        onInitialize={initialUrlState => {
          if (initialUrlState && initialUrlState.flyoutId) {
            setFlyoutItem(initialUrlState.flyoutId);
          }
          if (initialUrlState && initialUrlState.flyoutVisibility === FlyoutVisibility.visible) {
            showFlyout();
          }
          if (initialUrlState && initialUrlState.flyoutVisibility === FlyoutVisibility.hidden) {
            hideFlyout();
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
        flyoutVisibility: mapToFlyoutVisibilityState(value.flyoutVisibility),
      }
    : undefined;

const mapToFlyoutIdState = (subject: any) => {
  return subject && isString(subject) ? subject : undefined;
};
const mapToFlyoutVisibilityState = (subject: any) => {
  if (subject) {
    if (subject === 'visible') {
      return FlyoutVisibility.visible;
    }
    if (subject === 'hidden') {
      return FlyoutVisibility.hidden;
    }
  }
};
