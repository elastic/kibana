/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { EuiSuperSelect } from '@elastic/eui';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { ColorGradient } from '../../../../../icons/color_gradient';

export const COLOR_GRADIENTS = Object.keys(vislibColorMaps).map(colorKey => ({
  value: colorKey,
  text: colorKey,
  inputDisplay: <ColorGradient color={colorKey}/>
}));

export function ColorRampSelect({ color, onChange }) {
  const onColorRampChange = (selectedColorRampString) => {
    onChange({
      color: selectedColorRampString
    });
  };
  return (
    <EuiSuperSelect
      options={COLOR_GRADIENTS}
      onChange={onColorRampChange}
      valueOfSelected={color}
      hasDividers={true}
    />
  );
}

ColorRampSelect.propTypes = {
  color: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};
