/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ColorMappingInputData,
  PaletteOutput,
  PaletteRegistry,
  getSpecialString,
} from '@kbn/coloring';
import { CustomPaletteState } from '@kbn/charts-plugin/common';
import { getColorAccessorFn } from './color_mapping_accessor';

export type CellColorFn = (value?: number | string | null) => string | null;

export function getCellColorFn(
  paletteService: PaletteRegistry,
  data: ColorMappingInputData,
  isNumeric: boolean,
  isDarkMode: boolean,
  syncColors: boolean,
  palette?: PaletteOutput<CustomPaletteState>,
  colorMapping?: string
): CellColorFn {
  if (isNumeric && palette && data.type === 'ranges') {
    return (value) => {
      if (value === null || value === undefined || typeof value !== 'number') return null;

      return (
        paletteService.get(palette.name).getColorForValue?.(value, palette.params, data) ?? null
      );
    };
  }

  if (!isNumeric && data.type === 'categories') {
    if (colorMapping) {
      return getColorAccessorFn(colorMapping, data, isDarkMode);
    } else if (palette) {
      return (category) => {
        if (category === undefined || category === null || typeof category === 'number')
          return null;

        return paletteService.get(palette.name).getCategoricalColor(
          [
            {
              name: getSpecialString(category), // needed to sync special categories (i.e. '')
              rankAtDepth: Math.max(
                data.categories.findIndex((v) => v === category),
                0
              ),
              totalSeriesAtDepth: data.categories.length || 1,
            },
          ],
          {
            maxDepth: 1,
            totalSeries: data.categories.length || 1,
            behindText: false,
            syncColors,
          },
          palette?.params ?? { colors: [] }
        );
      };
    }
  }

  return () => null;
}
