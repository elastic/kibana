/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { getLegendColors } from 'ui/vis/map/color_util';
import classNames from 'classnames';

const GRADIENT_INTERVALS = 7;
const COLOR_KEYS = Object.keys(vislibColorMaps);

export const ColorGradient = ({ color, className }) => {
  if (!color || !COLOR_KEYS.includes(color)) {
    return null;
  }

  const classes = classNames('mapColorGradient', className);
  const rgbColorStrings = getLegendColors(vislibColorMaps[color].value, GRADIENT_INTERVALS);
  const background = getLinearGradient(rgbColorStrings, GRADIENT_INTERVALS);
  return (
    <div
      className={classes}
      style={{ background }}
    />
  );
};

function getLinearGradient(colorStrings, intervals) {
  let linearGradient = `linear-gradient(to right, ${colorStrings[0]} 0%,`;
  for (let i = 1; i < intervals - 1; i++) {
    linearGradient = `${linearGradient} ${colorStrings[i]} \
      ${Math.floor(100 * i / (intervals - 1))}%,`;
  }
  return `${linearGradient} ${colorStrings.pop()} 100%)`;
}
