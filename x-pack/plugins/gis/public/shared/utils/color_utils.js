/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { getLegendColors } from 'ui/vis/map/color_util';
import chroma from 'chroma-js';

export function getRGBColorRangeStrings(colorName, numberColors) {
  const colorKeys = Object.keys(vislibColorMaps);
  if (!colorKeys.includes(colorName)) {
    throw `${colorName} not found. Expected one of following values: \
      ${colorKeys}`;
  }
  return getLegendColors(vislibColorMaps[colorName].value, numberColors);
}

export function getHexColorRangeStrings(colorName, numberColors) {
  return getRGBColorRangeStrings(colorName, numberColors)
    .map(rgbColor => chroma(rgbColor).hex());
}