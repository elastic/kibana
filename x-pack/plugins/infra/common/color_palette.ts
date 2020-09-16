/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { difference, first, values } from 'lodash';
import { euiPaletteColorBlind } from '@elastic/eui';

export enum Color {
  color0 = 'color0',
  color1 = 'color1',
  color2 = 'color2',
  color3 = 'color3',
  color4 = 'color4',
  color5 = 'color5',
  color6 = 'color6',
  color7 = 'color7',
  color8 = 'color8',
  color9 = 'color9',
}

export type Palette = {
  [K in keyof typeof Color]: string;
};

const euiPalette = euiPaletteColorBlind();

export const defaultPalette: Palette = {
  [Color.color0]: euiPalette[1], // (blue)
  [Color.color1]: euiPalette[2], // (pink)
  [Color.color2]: euiPalette[0], // (green-ish)
  [Color.color3]: euiPalette[3], // (purple)
  [Color.color4]: euiPalette[4], // (light pink)
  [Color.color5]: euiPalette[5], // (yellow)
  [Color.color6]: euiPalette[6], // (tan)
  [Color.color7]: euiPalette[7], // (orange)
  [Color.color8]: euiPalette[8], // (brown)
  [Color.color9]: euiPalette[9], // (red)
};

export const createPaletteTransformer = (palette: Palette) => (color: Color) => palette[color];

export const colorTransformer = createPaletteTransformer(defaultPalette);

export const sampleColor = (usedColors: Color[] = []): Color => {
  const available = difference(values(Color) as Color[], usedColors);
  return first(available) || Color.color0;
};
