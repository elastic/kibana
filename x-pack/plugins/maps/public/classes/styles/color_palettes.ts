/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  euiPaletteForStatus,
  euiPaletteForTemperature,
  euiPaletteCool,
  euiPaletteWarm,
  euiPaletteNegative,
  euiPalettePositive,
  euiPaletteGray,
} from '@elastic/eui/lib/services';

import { EuiColorPalettePickerPaletteProps } from '@elastic/eui';

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
];

export const NUMERICAL_COLOR_PALETTES = COLOR_PALETTES.filter(
  (palette: EuiColorPalettePickerPaletteProps) => {
    return palette.type === 'gradient';
  }
);
