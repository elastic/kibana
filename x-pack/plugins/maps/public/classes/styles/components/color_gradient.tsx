/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  COLOR_RAMP_NAMES,
  GRADIENT_INTERVALS,
  getRGBColorRangeStrings,
  getLinearGradient,
} from '../color_utils';

interface Props {
  colorRamp?: string[];
  colorRampName?: string;
}

export const ColorGradient = ({ colorRamp, colorRampName }: Props) => {
  if (!colorRamp && (!colorRampName || !COLOR_RAMP_NAMES.includes(colorRampName))) {
    return null;
  }

  const rgbColorStrings = colorRampName
    ? getRGBColorRangeStrings(colorRampName, GRADIENT_INTERVALS)
    : colorRamp!;
  const background = getLinearGradient(rgbColorStrings);
  return <div className="mapColorGradient" style={{ background }} />;
};
