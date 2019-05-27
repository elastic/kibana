/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { getLegendColors, getColor } from 'ui/vis/map/color_util';
import chroma from 'chroma-js';

function getColorRamp(colorRampName) {
  const colorRamp = vislibColorMaps[colorRampName];
  if (!colorRamp) {
    throw new Error(`${colorRampName} not found. Expected one of following values: ${Object.keys(vislibColorMaps)}`);
  }
  return colorRamp;
}

export function getRGBColorRangeStrings(colorRampName, numberColors) {
  const colorRamp = getColorRamp(colorRampName);
  return getLegendColors(colorRamp.value, numberColors);
}

export function getHexColorRangeStrings(colorRampName, numberColors) {
  return getRGBColorRangeStrings(colorRampName, numberColors)
    .map(rgbColor => chroma(rgbColor).hex());
}

export function getColorRampCenterColor(colorRampName) {
  const colorRamp = getColorRamp(colorRampName);
  const centerIndex = Math.floor(colorRamp.value.length / 2);
  return getColor(colorRamp.value, centerIndex);
}
