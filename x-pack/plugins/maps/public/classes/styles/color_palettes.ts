/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chroma from 'chroma-js';
import {
  euiPaletteForStatus,
  euiPaletteForTemperature,
  euiPaletteCool,
  euiPaletteWarm,
  euiPaletteNegative,
  euiPalettePositive,
  euiPaletteGray,
  euiPaletteColorBlind,
} from '@elastic/eui/lib/services';
import { EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { DEFAULT_HEATMAP_COLOR_RAMP_NAME } from './heatmap/components/heatmap_constants';

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

export function getRGBColorRangeStrings(colorPaletteId: string): string[] {
  const colorPalette = COLOR_PALETTES.find(({ value }: EuiColorPalettePickerPaletteProps) => {
    return value === colorPaletteId;
  });
  return colorPalette ? colorPalette.palette : [];
}

export function getHexColorRangeStrings(colorPaletteId: string): string[] {
  return getRGBColorRangeStrings(colorPaletteId).map((rgbColor) => chroma(rgbColor).hex());
}

export function getColorRampCenterColor(colorPaletteId: string): string | null {
  if (!colorPaletteId) {
    return null;
  }
  const palette = getRGBColorRangeStrings(colorPaletteId);
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

  const hexColors = getHexColorRangeStrings(colorPaletteId);
  if (hexColors.length === 0) {
    return null;
  }

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
