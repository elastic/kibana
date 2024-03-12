/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProgress, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { imageLoadingSpinnerAriaLabel } from './translations';

const BorderedText = euiStyled(EuiText)`
  display: flex;
  align-items: center;
  width: 120px;
  height: 67.5px;
  justify-content: center;
  text-align: center;
  border: 1px solid ${(props) => props.theme.eui.euiColorLightShade};
`;

export const NoImageAvailable = () => {
  return (
    <BorderedText data-test-subj="pingTimestampNoImageAvailable">
      <strong>
        <FormattedMessage
          id="xpack.uptime.synthetics.screenshot.noImageMessage"
          defaultMessage="No image available"
        />
      </strong>
    </BorderedText>
  );
};

const BorderedTextLoading = euiStyled(EuiText)`
  display: flex;
  align-items: center;
  width: 120px;
  height: 65.5px;
  justify-content: center;
  text-align: center;
  border: 1px solid ${(props) => props.theme.eui.euiColorLightShade};
`;

export const LoadingImageState = () => {
  return (
    <>
      <EuiProgress size="xs" />
      <BorderedTextLoading
        data-test-subj="pingTimestampSpinner"
        aria-label={imageLoadingSpinnerAriaLabel}
      >
        <strong>
          <FormattedMessage
            id="xpack.uptime.synthetics.screenshot.loadingImageMessage"
            defaultMessage="Loading"
          />
        </strong>
      </BorderedTextLoading>
    </>
  );
};
