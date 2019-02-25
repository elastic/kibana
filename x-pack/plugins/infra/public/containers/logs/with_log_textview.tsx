/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { TextScale } from '../../../common/log_text_scale';
import { logTextviewActions, logTextviewSelectors, State } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { UrlStateContainer } from '../../utils/url_state';

const availableTextScales = ['large', 'medium', 'small'] as TextScale[];

export const withLogTextview = connect(
  (state: State) => ({
    availableTextScales,
    textScale: logTextviewSelectors.selectTextviewScale(state),
    urlState: selectTextviewUrlState(state),
    wrap: logTextviewSelectors.selectTextviewWrap(state),
  }),
  bindPlainActionCreators({
    setTextScale: logTextviewActions.setTextviewScale,
    setTextWrap: logTextviewActions.setTextviewWrap,
  })
);

export const WithLogTextview = asChildFunctionRenderer(withLogTextview);

/**
 * Url State
 */

interface LogTextviewUrlState {
  textScale?: ReturnType<typeof logTextviewSelectors.selectTextviewScale>;
  wrap?: ReturnType<typeof logTextviewSelectors.selectTextviewWrap>;
}

export const WithLogTextviewUrlState = () => (
  <WithLogTextview>
    {({ urlState, setTextScale, setTextWrap }) => (
      <UrlStateContainer
        urlState={urlState}
        urlStateKey="logTextview"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.textScale) {
            setTextScale(newUrlState.textScale);
          }
          if (newUrlState && typeof newUrlState.wrap !== 'undefined') {
            setTextWrap(newUrlState.wrap);
          }
        }}
        onInitialize={newUrlState => {
          if (newUrlState && newUrlState.textScale) {
            setTextScale(newUrlState.textScale);
          }
          if (newUrlState && typeof newUrlState.wrap !== 'undefined') {
            setTextWrap(newUrlState.wrap);
          }
        }}
      />
    )}
  </WithLogTextview>
);

const mapToUrlState = (value: any): LogTextviewUrlState | undefined =>
  value
    ? {
        textScale: mapToTextScaleUrlState(value.textScale),
        wrap: mapToWrapUrlState(value.wrap),
      }
    : undefined;

const mapToTextScaleUrlState = (value: any) =>
  availableTextScales.includes(value) ? (value as TextScale) : undefined;

const mapToWrapUrlState = (value: any) => (typeof value === 'boolean' ? value : undefined);

const selectTextviewUrlState = createSelector(
  logTextviewSelectors.selectTextviewScale,
  logTextviewSelectors.selectTextviewWrap,
  (textScale, wrap) => ({
    textScale,
    wrap,
  })
);
