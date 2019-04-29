/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { ColorPickerPopover } from '../../../components/color_picker_popover';

export const SimpleTemplate = ({ getArgValue, setArgValue, workpad }) => (
  <div style={{ fontSize: 0 }}>
    <ColorPickerPopover
      value={getArgValue('backgroundColor')}
      onChange={color => setArgValue('backgroundColor', color)}
      colors={workpad.colors}
      anchorPosition="leftCenter"
    />
  </div>
);

SimpleTemplate.displayName = 'ContainerStyleArgSimpleInput';

SimpleTemplate.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  getArgValue: PropTypes.func.isRequired,
  setArgValue: PropTypes.func.isRequired,
  workpad: PropTypes.shape({
    colors: PropTypes.array.isRequired,
  }),
};
