/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chroma from 'chroma-js';
import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';
import { isColorDark } from '@elastic/eui';

import {
  DataBounds,
  PaletteRegistry,
  PaletteOutput,
  CustomPaletteParams,
  getFallbackDataBounds,
  reversePalette,
  getPaletteStops,
  CUSTOM_PALETTE,
} from '@kbn/coloring';
import { Datatable } from '@kbn/expressions-plugin';

export function getContrastColor(
  color: string,
  isDarkTheme: boolean,
  darkTextProp: 'euiColorInk' | 'euiTextColor' = 'euiColorInk',
  lightTextProp: 'euiColorGhost' | 'euiTextColor' = 'euiColorGhost'
) {
  // when in light theme both text color and colorInk are dark and the choice
  // may depends on the specific context.
  const darkColor = isDarkTheme ? euiDarkVars.euiColorInk : euiLightVars[darkTextProp];
  // Same thing for light color in dark theme
  const lightColor = isDarkTheme ? euiDarkVars[lightTextProp] : euiLightVars.euiColorGhost;
  const backgroundColor = isDarkTheme
    ? euiDarkVars.euiPageBackgroundColor
    : euiLightVars.euiPageBackgroundColor;
  const finalColor =
    chroma(color).alpha() < 1 ? chroma.blend(backgroundColor, color, 'overlay') : chroma(color);
  return isColorDark(...finalColor.rgb()) ? lightColor : darkColor;
}

export function getNumericValue(rowValue: number | number[] | undefined) {
  if (rowValue == null || Array.isArray(rowValue)) {
    return;
  }
  return rowValue;
}

export function applyPaletteParams<T extends PaletteOutput<CustomPaletteParams>>(
  palettes: PaletteRegistry,
  activePalette: T,
  dataBounds: DataBounds
) {
  // make a copy of it as they have to be manipulated later on
  const displayStops = getPaletteStops(palettes, activePalette?.params || {}, {
    dataBounds,
    defaultPaletteName: activePalette?.name,
  });

  if (activePalette?.params?.reverse && activePalette?.params?.name !== CUSTOM_PALETTE) {
    return reversePalette(displayStops);
  }
  return displayStops;
}

export const findMinMaxByColumnId = (
  columnIds: string[],
  table: Datatable | undefined,
  getOriginalId: (id: string) => string = (id: string) => id
) => {
  const minMax: Record<string, DataBounds> = {};

  if (table != null) {
    for (const columnId of columnIds) {
      const originalId = getOriginalId(columnId);
      minMax[originalId] = minMax[originalId] || {
        max: Number.NEGATIVE_INFINITY,
        min: Number.POSITIVE_INFINITY,
      };
      table.rows.forEach((row) => {
        const rowValue = row[columnId];
        const numericValue = getNumericValue(rowValue);
        if (numericValue != null) {
          if (minMax[originalId].min > numericValue) {
            minMax[originalId].min = numericValue;
          }
          if (minMax[originalId].max < numericValue) {
            minMax[originalId].max = numericValue;
          }
        }
      });
      // what happens when there's no data in the table? Fallback to a percent range
      if (minMax[originalId].max === Number.NEGATIVE_INFINITY) {
        minMax[originalId] = getFallbackDataBounds();
      }
    }
  }
  return minMax;
};
