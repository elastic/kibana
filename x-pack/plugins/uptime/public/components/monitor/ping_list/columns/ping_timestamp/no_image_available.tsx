/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

const BorderedText = euiStyled(EuiText)`
  width: 120px;
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
