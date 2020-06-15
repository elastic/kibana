/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import tinycolor from 'tinycolor2';
import {
  // @ts-ignore
  euiPaletteForStatus,
  // @ts-ignore
  euiPaletteForTemperature,
  // @ts-ignore
  euiPaletteCool,
  // @ts-ignore
  euiPaletteWarm,
  // @ts-ignore
  euiPaletteNegative,
  // @ts-ignore
  euiPalettePositive,
  // @ts-ignore
  euiPaletteGray,
  // @ts-ignore
  euiPaletteColorBlind,
} from '@elastic/eui/lib/services';
import { EuiColorPalettePickerPaletteProps } from '@elastic/eui';

export const DEFAULT_HEATMAP_COLOR_RAMP_NAME = 'theclassic';

export const DEFAULT_FILL_COLORS: string[] = euiPaletteColorBlind();
export const DEFAULT_LINE_COLORS: string[] = [
  ...DEFAULT_FILL_COLORS.map((color: string) => tinycolor(color).darken().toHexString()),
  // Explicitly add black & white as border color options
  '#000',
  '#FFF',
];

const COLOR_PALETTES: EuiColorPalettePickerPaletteProps[] = [
  {
    value: 'Blues',
    palette: euiPaletteCool(8),
    type: 'gradient',
  },
  {
    value: 'Greens',
    palette: euiPalettePositive(8),
    type: 'gradient',
  },
  {
    value: 'Greys',
    palette: euiPaletteGray(8),
    type: 'gradient',
  },
  {
    value: 'Reds',
    palette: euiPaletteNegative(8),
    type: 'gradient',
  },
  {
    value: 'Yellow to Red',
    palette: euiPaletteWarm(8),
    type: 'gradient',
  },
  {
    value: 'Green to Red',
    palette: euiPaletteForStatus(8),
    type: 'gradient',
  },
  {
    value: 'Blue to Red',
    palette: euiPaletteForTemperature(8),
    type: 'gradient',
  },
  {
    value: DEFAULT_HEATMAP_COLOR_RAMP_NAME,
    palette: [
      'rgb(65, 105, 225)', // royalblue
      'rgb(0, 256, 256)', // cyan
      'rgb(0, 256, 0)', // lime
      'rgb(256, 256, 0)', // yellow
      'rgb(256, 0, 0)', // red
    ],
    type: 'gradient',
  },
  {
    value: 'palette_0',
    palette: euiPaletteColorBlind(),
    type: 'fixed',
  },
  {
    value: 'palette_20',
    palette: euiPaletteColorBlind({ rotations: 2 }),
    type: 'fixed',
  },
  {
    value: 'palette_30',
    palette: euiPaletteColorBlind({ rotations: 3 }),
    type: 'fixed',
  },
];

export const NUMERICAL_COLOR_PALETTES = COLOR_PALETTES.filter(
  (palette: EuiColorPalettePickerPaletteProps) => {
    return palette.type === 'gradient';
  }
);

export const CATEGORICAL_COLOR_PALETTES = COLOR_PALETTES.filter(
  (palette: EuiColorPalettePickerPaletteProps) => {
    return palette.type === 'fixed';
  }
);

export function getColorPalette(colorPaletteId: string): string[] {
  const colorPalette = COLOR_PALETTES.find(({ value }: EuiColorPalettePickerPaletteProps) => {
    return value === colorPaletteId;
  });
  return colorPalette ? (colorPalette.palette as string[]) : [];
}

export function getColorRampCenterColor(colorPaletteId: string): string | null {
  if (!colorPaletteId) {
    return null;
  }
  const palette = getColorPalette(colorPaletteId);
  return palette.length === 0 ? null : palette[Math.floor(palette.length / 2)];
}

// Returns an array of color stops
// [ stop_input_1: number, stop_output_1: color, stop_input_n: number, stop_output_n: color ]
export function getOrdinalMbColorRampStops(
  colorPaletteId: string,
  min: number,
  max: number
): Array<number | string> | null {
  if (!colorPaletteId) {
    return null;
  }

  if (min > max) {
    return null;
  }

  const palette = getColorPalette(colorPaletteId);
  if (palette.length === 0) {
    return null;
  }

  if (max === min) {
    // just return single stop value
    return [max, palette[palette.length - 1]];
  }

  const delta = max - min;
  return palette.reduce(
    (accu: Array<number | string>, stopColor: string, idx: number, srcArr: string[]) => {
      const stopNumber = min + (delta * idx) / srcArr.length;
      return [...accu, stopNumber, stopColor];
    },
    []
  );
}

export function getLinearGradient(colorStrings: string[]): string {
  const intervals = colorStrings.length;
  let linearGradient = `linear-gradient(to right, ${colorStrings[0]} 0%,`;
  for (let i = 1; i < intervals - 1; i++) {
    linearGradient = `${linearGradient} ${colorStrings[i]} \
      ${Math.floor((100 * i) / (intervals - 1))}%,`;
  }
  return `${linearGradient} ${colorStrings[colorStrings.length - 1]} 100%)`;
}
