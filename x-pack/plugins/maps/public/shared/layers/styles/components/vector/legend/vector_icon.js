/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { dynamicColorShape, staticColorShape } from '../style_option_shapes';
import { FillableCircle, FillableRectangle } from '../../../../../icons/additional_layer_icons';
import { VectorStyle } from '../../../vector_style';
import { getColorRampCenterColor } from '../../../../../utils/color_utils';

export function VectorIcon({ fillColor, lineColor, isPointsOnly }) {
  const style = {
    stroke: extractColorFromStyleProperty(lineColor, 'none'),
    strokeWidth: '1px',
    fill: extractColorFromStyleProperty(fillColor, 'grey'),
  };

  return isPointsOnly
    ? <FillableCircle style={style}/>
    : <FillableRectangle style={style}/>;
}

function extractColorFromStyleProperty(colorStyleProperty, defaultColor) {
  if (!colorStyleProperty) {
    return defaultColor;
  }

  if (colorStyleProperty.type === VectorStyle.STYLE_TYPE.STATIC) {
    return colorStyleProperty.options.color;
  }

  // return middle of gradient for dynamic style property
  return getColorRampCenterColor(colorStyleProperty.options.color);
}

const colorStylePropertyShape = PropTypes.shape({
  type: PropTypes.string.isRequired,
  options: PropTypes.oneOfType([
    dynamicColorShape,
    staticColorShape
  ]).isRequired,
});

VectorIcon.propTypes = {
  fillColor: colorStylePropertyShape,
  lineColor: colorStylePropertyShape,
  isPointsOnly: PropTypes.bool,
};
