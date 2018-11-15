/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { BorderForm } from './border_form';
import { AppearanceForm } from './appearance_form';

export const ExtendedTemplate = ({ getArgValue, setArgValue, workpad }) => (
  <div>
    <EuiTitle size="xxxs" textTransform="uppercase">
      <h6>Appearance</h6>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiSpacer size="xs" />
    <AppearanceForm
      padding={getArgValue('padding')}
      backgroundColor={getArgValue('backgroundColor')}
      opacity={getArgValue('opacity')}
      overflow={getArgValue('overflow')}
      onChange={setArgValue}
    />

    <EuiSpacer size="m" />

    <EuiTitle size="xxxs" textTransform="uppercase">
      <h6>Border</h6>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiSpacer size="xs" />
    <BorderForm
      value={getArgValue('border', '')}
      radius={getArgValue('borderRadius')}
      onChange={setArgValue}
      colors={workpad.colors}
    />
  </div>
);

ExtendedTemplate.displayName = 'ContainerStyleArgExtendedInput';

ExtendedTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  getArgValue: PropTypes.func.isRequired,
  setArgValue: PropTypes.func.isRequired,
  workpad: PropTypes.shape({
    colors: PropTypes.array.isRequired,
  }).isRequired,
};
