/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { getRGBColorRangeStrings } from '../color_utils';
import classNames from 'classnames';

const GRADIENT_INTERVALS = 7;
const COLOR_KEYS = Object.keys(vislibColorMaps);

export const ColorGradient = ({ colorRamp, colorRampName, className }) => {
  if (!colorRamp && (!colorRampName || !COLOR_KEYS.includes(colorRampName))) {
    return null;
  }

  const classes = classNames('mapColorGradient', className);
  const rgbColorStrings = colorRampName
    ? getRGBColorRangeStrings(colorRampName, GRADIENT_INTERVALS)
    : colorRamp;
  const background = getLinearGradient(rgbColorStrings);
  return (
    <div
      className={classes}
      style={{ background }}
    />
  );
};

function getLinearGradient(colorStrings) {
  const intervals = colorStrings.length;
  let linearGradient = `linear-gradient(to right, ${colorStrings[0]} 0%,`;
  for (let i = 1; i < intervals - 1; i++) {
    linearGradient = `${linearGradient} ${colorStrings[i]} \
      ${Math.floor(100 * i / (intervals - 1))}%,`;
  }
  return `${linearGradient} ${colorStrings[colorStrings.length - 1]} 100%)`;
}
