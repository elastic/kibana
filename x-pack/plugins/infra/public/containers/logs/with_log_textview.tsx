/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useMemo } from 'react';

import { UrlStateContainer } from '../../utils/url_state';
import { availableTextScales, LogViewConfiguration, TextScale } from './log_view_configuration';

interface LogTextviewUrlState {
  textScale?: TextScale;
  wrap?: boolean;
}

export const WithLogTextviewUrlState = () => {
  const { textScale, textWrap, setTextScale, setTextWrap } = useContext(
    LogViewConfiguration.Context
  );

  const urlState = useMemo(() => ({ textScale, wrap: textWrap }), [textScale, textWrap]);

  return (
    <UrlStateContainer
      urlState={urlState}
      urlStateKey="logTextview"
      mapToUrlState={mapToUrlState}
      onChange={(newUrlState) => {
        if (newUrlState && newUrlState.textScale) {
          setTextScale(newUrlState.textScale);
        }
        if (newUrlState && typeof newUrlState.wrap !== 'undefined') {
          setTextWrap(newUrlState.wrap);
        }
      }}
      onInitialize={(newUrlState) => {
        if (newUrlState && newUrlState.textScale) {
          setTextScale(newUrlState.textScale);
        }
        if (newUrlState && typeof newUrlState.wrap !== 'undefined') {
          setTextWrap(newUrlState.wrap);
        }
      }}
    />
  );
};

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
