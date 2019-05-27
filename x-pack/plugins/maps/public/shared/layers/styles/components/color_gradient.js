/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { getRGBColorRangeStrings, getLinearGradient } from '../color_utils';
import classNames from 'classnames';

const COLOR_KEYS = Object.keys(vislibColorMaps);

export const ColorGradient = ({ colorRamp, colorRampName, className }) => {
  if (!colorRamp && (!colorRampName || !COLOR_KEYS.includes(colorRampName))) {
    return null;
  }

  const classes = classNames('mapColorGradient', className);
  const rgbColorStrings = colorRampName
    ? getRGBColorRangeStrings(colorRampName)
    : colorRamp;
  const background = getLinearGradient(rgbColorStrings);
  return (
    <div
      className={classes}
      style={{ background }}
    />
  );
};


