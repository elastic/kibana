/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, first } from 'lodash';
import { euiPaletteColorBlind } from '@elastic/eui';

export type Color =
  | 'color0'
  | 'color1'
  | 'color2'
  | 'color3'
  | 'color4'
  | 'color5'
  | 'color6'
  | 'color7'
  | 'color8'
  | 'color9';

export type Palette = {
  [K in Color]: string;
};

const euiPalette = euiPaletteColorBlind();

export const defaultPalette: Palette = {
  color0: euiPalette[1], // (blue)
  color1: euiPalette[2], // (pink)
  color2: euiPalette[0], // (green-ish)
  color3: euiPalette[3], // (purple)
  color4: euiPalette[4], // (light pink)
  color5: euiPalette[5], // (yellow)
  color6: euiPalette[6], // (tan)
  color7: euiPalette[7], // (orange)
  color8: euiPalette[8], // (brown)
  color9: euiPalette[9], // (red)
};

export const createPaletteTransformer = (palette: Palette) => (color: Color) => palette[color];

export const colorTransformer = createPaletteTransformer(defaultPalette);

export const sampleColor = (usedColors: Color[] = []): Color => {
  const allColors = [
    'color0',
    'color1',
    'color2',
    'color3',
    'color4',
    'color5',
    'color6',
    'color7',
    'color8',
    'color9',
  ] as Color[];
  const available = difference(allColors, usedColors);
  return first(available) || allColors[0];
};
