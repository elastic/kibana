/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiSuperSelect
} from '@elastic/eui';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { ColorGradient } from '../../../../../icons/color_gradient';

const COLOR_GRADIENTS = Object.keys(vislibColorMaps).map(colorKey => ({
  value: colorKey,
  text: colorKey,
  inputDisplay: <ColorGradient color={colorKey}/>
}));

const onColorRampChange = onChange =>
  selectedColorRampString => {
    onChange({
      color: selectedColorRampString
    });
  };

export function ColorRampSelector({ color, onChange }) {
  if (color) {
    return (
      <EuiSuperSelect
        options={COLOR_GRADIENTS}
        onChange={onColorRampChange(onChange)}
        valueOfSelected={color}
        hasDividers={true}
      />
    );
  } else {
    // Default to first color gradient
    onColorRampChange(onChange)(COLOR_GRADIENTS[0].value);
    return null;
  }
}

ColorRampSelector.propTypes = {
  color: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
