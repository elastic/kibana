/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { COLOR_RAMP_NAMES, getRGBColorRangeStrings, getLinearGradient } from '../color_utils';
import classNames from 'classnames';

export const ColorGradient = ({ colorRamp, colorRampName, className }) => {
  if (!colorRamp && (!colorRampName || !COLOR_RAMP_NAMES.includes(colorRampName))) {
    return null;
  }

  const classes = classNames('mapColorGradient', className);
  const rgbColorStrings = colorRampName ? getRGBColorRangeStrings(colorRampName) : colorRamp;
  const background = getLinearGradient(rgbColorStrings);
  return <div className={classes} style={{ background }} />;
};
