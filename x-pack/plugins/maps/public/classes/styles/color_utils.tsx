/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import tinycolor from 'tinycolor2';
import chroma from 'chroma-js';
// @ts-ignore
import { euiPaletteColorBlind } from '@elastic/eui/lib/services';
import { ColorGradient } from './components/color_gradient';
import { RawColorSchema, vislibColorMaps } from '../../../../../../src/plugins/charts/public';

export const GRADIENT_INTERVALS = 8;

export const DEFAULT_FILL_COLORS: string[] = euiPaletteColorBlind();
export const DEFAULT_LINE_COLORS: string[] = [
  ...DEFAULT_FILL_COLORS.map((color: string) => tinycolor(color).darken().toHexString()),
  // Explicitly add black & white as border color options
  '#000',
  '#FFF',
];

function getRGBColors(colorRamp: Array<[number, number[]]>, numLegendColors: number = 4): string[] {
  const colors = [];
  colors[0] = getRGBColor(colorRamp, 0);
  for (let i = 1; i < numLegendColors - 1; i++) {
    colors[i] = getRGBColor(colorRamp, Math.floor((colorRamp.length * i) / numLegendColors));
  }
  colors[numLegendColors - 1] = getRGBColor(colorRamp, colorRamp.length - 1);
  return colors;
}

function getRGBColor(colorRamp: Array<[number, number[]]>, i: number): string {
  const rgbArray = colorRamp[i][1];
  const red = Math.floor(rgbArray[0] * 255);
  const green = Math.floor(rgbArray[1] * 255);
  const blue = Math.floor(rgbArray[2] * 255);
  return `rgb(${red},${green},${blue})`;
}

function getColorSchema(colorRampName: string): RawColorSchema {
  const colorSchema = vislibColorMaps[colorRampName];
  if (!colorSchema) {
    throw new Error(
      `${colorRampName} not found. Expected one of following values: ${Object.keys(
        vislibColorMaps
      )}`
    );
  }
  return colorSchema;
}

export function getRGBColorRangeStrings(
  colorRampName: string,
  numberColors: number = GRADIENT_INTERVALS
): string[] {
  const colorSchema = getColorSchema(colorRampName);
  return getRGBColors(colorSchema.value, numberColors);
}

export function getHexColorRangeStrings(
  colorRampName: string,
  numberColors: number = GRADIENT_INTERVALS
): string[] {
  return getRGBColorRangeStrings(colorRampName, numberColors).map((rgbColor) =>
    chroma(rgbColor).hex()
  );
}

export function getColorRampCenterColor(colorRampName: string): string | null {
  if (!colorRampName) {
    return null;
  }
  const colorSchema = getColorSchema(colorRampName);
  const centerIndex = Math.floor(colorSchema.value.length / 2);
  return getRGBColor(colorSchema.value, centerIndex);
}

// Returns an array of color stops
// [ stop_input_1: number, stop_output_1: color, stop_input_n: number, stop_output_n: color ]
export function getOrdinalMbColorRampStops(
  colorRampName: string,
  min: number,
  max: number,
  numberColors: number
): Array<number | string> | null {
  if (!colorRampName) {
    return null;
  }

  if (min > max) {
    return null;
  }

  const hexColors = getHexColorRangeStrings(colorRampName, numberColors);
  if (max === min) {
    // just return single stop value
    return [max, hexColors[hexColors.length - 1]];
  }

  const delta = max - min;
  return hexColors.reduce(
    (accu: Array<number | string>, stopColor: string, idx: number, srcArr: string[]) => {
      const stopNumber = min + (delta * idx) / srcArr.length;
      return [...accu, stopNumber, stopColor];
    },
    []
  );
}

export const COLOR_GRADIENTS = Object.keys(vislibColorMaps).map((colorRampName) => ({
  value: colorRampName,
  inputDisplay: <ColorGradient colorRampName={colorRampName} />,
}));

export const COLOR_RAMP_NAMES = Object.keys(vislibColorMaps);

export function getLinearGradient(colorStrings: string[]): string {
  const intervals = colorStrings.length;
  let linearGradient = `linear-gradient(to right, ${colorStrings[0]} 0%,`;
  for (let i = 1; i < intervals - 1; i++) {
    linearGradient = `${linearGradient} ${colorStrings[i]} \
      ${Math.floor((100 * i) / (intervals - 1))}%,`;
  }
  return `${linearGradient} ${colorStrings[colorStrings.length - 1]} 100%)`;
}

export interface ColorPalette {
  id: string;
  colors: string[];
}

const COLOR_PALETTES_CONFIGS: ColorPalette[] = [
  {
    id: 'palette_0',
    colors: euiPaletteColorBlind(),
  },
  {
    id: 'palette_20',
    colors: euiPaletteColorBlind({ rotations: 2 }),
  },
  {
    id: 'palette_30',
    colors: euiPaletteColorBlind({ rotations: 3 }),
  },
];

export function getColorPalette(paletteId: string): string[] | null {
  const palette = COLOR_PALETTES_CONFIGS.find(({ id }: ColorPalette) => id === paletteId);
  return palette ? palette.colors : null;
}

export const COLOR_PALETTES = COLOR_PALETTES_CONFIGS.map((palette) => {
  const paletteDisplay = palette.colors.map((color) => {
    const style: React.CSSProperties = {
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
