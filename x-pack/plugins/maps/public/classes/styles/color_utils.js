/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import tinycolor from 'tinycolor2';
import chroma from 'chroma-js';
import { euiPaletteColorBlind } from '@elastic/eui/lib/services';
import { ColorGradient } from './components/color_gradient';
import { vislibColorMaps } from '../../../../../../src/plugins/charts/public';

export const GRADIENT_INTERVALS = 8;

export const DEFAULT_FILL_COLORS = euiPaletteColorBlind();
export const DEFAULT_LINE_COLORS = [
  ...DEFAULT_FILL_COLORS.map((color) => tinycolor(color).darken().toHexString()),
  // Explicitly add black & white as border color options
  '#000',
  '#FFF',
];

function getLegendColors(colorRamp, numLegendColors = 4) {
  const colors = [];
  colors[0] = getColor(colorRamp, 0);
  for (let i = 1; i < numLegendColors - 1; i++) {
    colors[i] = getColor(colorRamp, Math.floor((colorRamp.length * i) / numLegendColors));
  }
  colors[numLegendColors - 1] = getColor(colorRamp, colorRamp.length - 1);
  return colors;
}

function getColor(colorRamp, i) {
  const color = colorRamp[i][1];
  const red = Math.floor(color[0] * 255);
  const green = Math.floor(color[1] * 255);
  const blue = Math.floor(color[2] * 255);
  return `rgb(${red},${green},${blue})`;
}

function getColorRamp(colorRampName) {
  const colorRamp = vislibColorMaps[colorRampName];
  if (!colorRamp) {
    throw new Error(
      `${colorRampName} not found. Expected one of following values: ${Object.keys(
        vislibColorMaps
      )}`
    );
  }
  return colorRamp;
}

export function getRGBColorRangeStrings(colorRampName, numberColors = GRADIENT_INTERVALS) {
  const colorRamp = getColorRamp(colorRampName);
  return getLegendColors(colorRamp.value, numberColors);
}

export function getHexColorRangeStrings(colorRampName, numberColors = GRADIENT_INTERVALS) {
  return getRGBColorRangeStrings(colorRampName, numberColors).map((rgbColor) =>
    chroma(rgbColor).hex()
  );
}

export function getColorRampCenterColor(colorRampName) {
  if (!colorRampName) {
    return null;
  }
  const colorRamp = getColorRamp(colorRampName);
  const centerIndex = Math.floor(colorRamp.value.length / 2);
  return getColor(colorRamp.value, centerIndex);
}

// Returns an array of color stops
// [ stop_input_1: number, stop_output_1: color, stop_input_n: number, stop_output_n: color ]
export function getOrdinalMbColorRampStops(colorRampName, min, max, numberColors) {
  if (!colorRampName) {
    return null;
  }

  if (min > max) {
    return null;
  }

  const hexColors = getHexColorRangeStrings(colorRampName, numberColors);
  if (max === min) {
    //just return single stop value
    return [max, hexColors[hexColors.length - 1]];
  }

  const delta = max - min;
  return hexColors.reduce((accu, stopColor, idx, srcArr) => {
    const stopNumber = min + (delta * idx) / srcArr.length;
    return [...accu, stopNumber, stopColor];
  }, []);
}

export const COLOR_GRADIENTS = Object.keys(vislibColorMaps).map((colorRampName) => ({
  value: colorRampName,
  inputDisplay: <ColorGradient colorRampName={colorRampName} />,
}));

export const COLOR_RAMP_NAMES = Object.keys(vislibColorMaps);

export function getLinearGradient(colorStrings) {
  const intervals = colorStrings.length;
  let linearGradient = `linear-gradient(to right, ${colorStrings[0]} 0%,`;
  for (let i = 1; i < intervals - 1; i++) {
    linearGradient = `${linearGradient} ${colorStrings[i]} \
      ${Math.floor((100 * i) / (intervals - 1))}%,`;
  }
  return `${linearGradient} ${colorStrings[colorStrings.length - 1]} 100%)`;
}

const COLOR_PALETTES_CONFIGS = [
  {
    id: 'palette_0',
    colors: euiPaletteColorBlind(),
  },
  {
    id: 'palette_20',
    colors: euiPaletteColorBlind(2),
  },
  {
    id: 'palette_30',
    colors: euiPaletteColorBlind(3),
  },
];

export function getColorPalette(paletteId) {
  const palette = COLOR_PALETTES_CONFIGS.find((palette) => palette.id === paletteId);
  return palette ? palette.colors : null;
}

export const COLOR_PALETTES = COLOR_PALETTES_CONFIGS.map((palette) => {
  const paletteDisplay = palette.colors.map((color) => {
    const style = {
      backgroundColor: color,
      width: `${100 / palette.colors.length}%`,
      position: 'relative',
      height: '100%',
      display: 'inline-block',
    };
    return (
      <div style={style} key={color}>
        &nbsp;
      </div>
    );
  });
  return {
    value: palette.id,
    inputDisplay: <div className={'mapColorGradient'}>{paletteDisplay}</div>,
  };
});
