/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InventoryColorPalette, InfraWaffleMapSteppedGradientLegend } from '../../../../lib/lib';
import { getColorPalette } from './get_color_palette';

export const createLegend = (
  name: InventoryColorPalette,
  steps: number = 10,
  reverse: boolean = false
): InfraWaffleMapSteppedGradientLegend => {
  const paletteColors = getColorPalette(name, steps, reverse);
  return {
    type: 'steppedGradient',
    rules: paletteColors.map((color, index) => ({
      color,
      value: (index + 1) / steps,
    })),
  };
};
