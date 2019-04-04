/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { difference, sample } from 'lodash';

export enum MetricsExplorerColorPalette {
  color0 = '#3185FC', // euiColorVis1 (blue)
  color1 = '#DB1374', // euiColorVis2 (red-ish)
  color2 = '#490092', // euiColorVis3 (purple)
  color3 = '#00B3A4', // euiColorVis0 (green-ish)
  color4 = '#F98510', // euiColorVis7 (orange)
  color5 = '#E6C220', // euiColorVis7 (yellow)
  color6 = '#333333', // euiColorVis7 (black-ish)
}

export const colorPalette = [
  MetricsExplorerColorPalette.color0,
  MetricsExplorerColorPalette.color1,
  MetricsExplorerColorPalette.color2,
  MetricsExplorerColorPalette.color3,
  MetricsExplorerColorPalette.color4,
  MetricsExplorerColorPalette.color5,
  MetricsExplorerColorPalette.color6,
];

export const getUnusedColor = (usedColors: MetricsExplorerColorPalette[]) => {
  const available = difference(colorPalette, usedColors);
  return sample(available) || MetricsExplorerColorPalette.color0;
};
