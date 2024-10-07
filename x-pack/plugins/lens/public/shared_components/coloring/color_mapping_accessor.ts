/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AVAILABLE_PALETTES,
  getColorFactory,
  getPalette,
  NeutralPalette,
  ColorMappingInputCategoricalData,
} from '@kbn/coloring';
import { CellColorFn } from './get_cell_color_fn';

/**
 * Return a color accessor function for XY charts depending on the split accessors received.
 */
export function getColorAccessorFn(
  colorMapping: string,
  data: ColorMappingInputCategoricalData,
  isDarkMode: boolean
): CellColorFn {
  const getColor = getColorFactory(
    JSON.parse(colorMapping),
    getPalette(AVAILABLE_PALETTES, NeutralPalette),
    isDarkMode,
    data
  );

  return (value) => {
    if (value === undefined || value === null) return null;

    return getColor(String(value));
  };
}
