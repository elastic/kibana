/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { dynamicColorShape, staticColorShape } from '../style_option_shapes';
import { ColorGradient } from '../../../../../icons/color_gradient';
import { FillableCircle, FillableVector } from '../../../../../icons/additional_layer_icons';
import { VectorStyle } from '../../../vector_style';

export function VectorIcon({ fillColor, lineColor, isPointsOnly }) {
  if (fillColor && fillColor.type === VectorStyle.STYLE_TYPE.DYNAMIC) {
    return (
      <ColorGradient
        className="mapColorGradientIcon"
        color={fillColor.options.color}
      />
    );
  }

  const stroke = lineColor && lineColor.type === VectorStyle.STYLE_TYPE.STATIC
    ? lineColor && lineColor.options.color
    : 'grey';
  const fill = fillColor && fillColor.type === VectorStyle.STYLE_TYPE.STATIC
    ? fillColor && fillColor.options.color
    : 'none';

  const style = {
    stroke,
    strokeWidth: '1px',
    fill
  };

  return (
    isPointsOnly
      ? <FillableCircle style={style}/>
      : <FillableVector style={style}/>
  );
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
