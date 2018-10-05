/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { injectI18n } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { templateFromReactComponent } from '../../lib/template_from_react_component';
import { ColorPickerMini } from '../../components/color_picker_mini/';

const ColorArgInput = ({ onValueChange, argValue, workpad }) => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem grow={false}>
      <ColorPickerMini value={argValue} onChange={onValueChange} colors={workpad.colors} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

ColorArgInput.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  workpad: PropTypes.shape({
    colors: PropTypes.array.isRequired,
  }).isRequired,
};

const colorUI = intl => ({
  name: 'color',
  displayName: intl.formatMessage({
    id: 'xpack.canvas.expressionTypes.colorDisplayName',
    defaultMessage: 'Color',
  }),
  help: intl.formatMessage({
    id: 'xpack.canvas.expressionTypes.colorHelpText',
    defaultMessage: 'Color picker',
  }),
  simpleTemplate: templateFromReactComponent(ColorArgInput),
  default: '#000000',
});

export const color = injectI18n(colorUI);
