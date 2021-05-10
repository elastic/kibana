/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { isColorDark } from '@elastic/eui';
import chroma from 'chroma-js';
import { CustomPaletteState } from 'src/plugins/charts/common';
import { IUiSettingsClient } from 'kibana/public';
import type { FormatFactory } from '../../types';
import type { DataContextType } from './types';
import { ColumnConfig } from './table_basic';

function findColorSegment(
  value: number,
  { min, max }: { min: number; max: number },
  comparison: (value: number, bucket: number) => number,
  colors: string[],
  rangeMin?: number,
  rangeMax?: number
) {
  const maxValue = rangeMax ?? max;
  const minValue = rangeMin ?? min;
  // assume uniform distribution within the provided range, can ignore stops
  const step = (maxValue - minValue) / colors.length;

  // what about values in range
  const index = colors.findIndex((c, i) => comparison(value, minValue + (1 + i) * step) <= 0);
  return colors[index] || colors[0];
}

function findColorsByStops(
  value: number,
  comparison: (value: number, bucket: number) => number,
  colors: string[],
  stops: number[]
) {
  const index = stops.findIndex((s) => comparison(value, s) < 0);
  return colors[index] || colors[0];
}

function getNormalizedValueByRange(
  value: number,
  { range }: CustomPaletteState,
  minMax: { min: number; max: number }
) {
  let result = value;
  if (range === 'percent') {
    result = (100 * (value - minMax.min)) / (minMax.max - minMax.min);
  }
  // for a range of 1 value the formulas above will divide by 0, so here's a safety guard
  if (Number.isNaN(result)) {
    return 1;
  }
  return result;
}

function workoutColorForCell(
  value: number,
  params: CustomPaletteState,
  minMax: { min: number; max: number },
  gradientHelper: (value: number) => string
) {
  if (value == null) {
    return '';
  }
  const { colors, stops, range, gradient, continuity, rangeMax, rangeMin } = params;
  // ranges can be absolute numbers or percentages
  // normalized the incoming value to the same format as range to make easier comparisons
  const normalizedValue = getNormalizedValueByRange(value, params, minMax);
  const extraRangeArguments = range === 'percent' ? [0, 100] : [minMax.min, minMax.max];
  const comparisonFn = (v: number, threshold: number) => v - threshold;

  const maxRange = stops.length ? rangeMax : extraRangeArguments[1];
  const minRange = stops.length ? rangeMin : extraRangeArguments[0];

  // in case of shorter rangers, extends the steps on the sides to cover the whole set
  if (comparisonFn(normalizedValue, maxRange) > 0) {
    if (continuity === 'above' || continuity === 'all') {
      return colors[colors.length - 1];
    }
    return;
  }
  if (comparisonFn(normalizedValue, minRange) < 0) {
    if (continuity === 'below' || continuity === 'all') {
      return colors[0];
    }
    return;
  }

  if (gradient && gradientHelper) {
    return gradientHelper(normalizedValue) || '';
  }

  if (stops.length) {
    return findColorsByStops(normalizedValue, comparisonFn, colors, stops);
  }

  return findColorSegment(normalizedValue, minMax, comparisonFn, colors, ...extraRangeArguments);
}

export const createGridCell = (
  formatters: Record<string, ReturnType<FormatFactory>>,
  columnConfig: ColumnConfig,
  DataContext: React.Context<DataContextType>,
  uiSettings: IUiSettingsClient
) => {
  // Changing theme requires a full reload of the page, so we can cache here
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');
  const darkColor = IS_DARK_THEME ? darkTheme.euiColorEmptyShade : lightTheme.euiTextColor;
  const lightColor = IS_DARK_THEME ? darkTheme.euiTextColor : lightTheme.euiColorEmptyShade;
  return ({ rowIndex, columnId, setCellProps }: EuiDataGridCellValueElementProps) => {
    const { table, alignments, minMaxByColumnId, gradientHelpers } = useContext(DataContext);
    const rowValue = table?.rows[rowIndex][columnId];
    const content = formatters[columnId]?.convert(rowValue, 'html');
    const currentAlignment = alignments && alignments[columnId];
    const alignmentClassName = `lnsTableCell--${currentAlignment}`;

    const { colorMode, palette } =
      columnConfig.columns.find(({ columnId: id }) => id === columnId) || {};

    useEffect(() => {
      if (minMaxByColumnId?.[columnId]) {
        if (colorMode !== 'none' && palette?.params && gradientHelpers) {
          // workout the bucket the value belongs to
          const color = workoutColorForCell(
            rowValue,
            palette.params,
            minMaxByColumnId[columnId],
            gradientHelpers[columnId]
          );
          if (color) {
            const style = { [colorMode === 'cell' ? 'backgroundColor' : 'color']: color };
            if (colorMode === 'cell' && color) {
              style.color = isColorDark(...chroma(color).rgb()) ? lightColor : darkColor;
            }
            setCellProps({
              style,
            });
          }
        }
      }
      // make sure to clean it up when something change
      // this avoids cell's styling to stick forever
      return () => {
        if (minMaxByColumnId?.[columnId]) {
          setCellProps({
            style: {
              backgroundColor: undefined,
              color: undefined,
            },
          });
        }
      };
    }, [rowValue, columnId, setCellProps, colorMode, palette, minMaxByColumnId, gradientHelpers]);

    return (
      <div
        /*
         * dangerouslySetInnerHTML is necessary because the field formatter might produce HTML markup
         * which is produced in a safe way.
         */
        dangerouslySetInnerHTML={{ __html: content }} // eslint-disable-line react/no-danger
        data-test-subj="lnsTableCellContent"
        className={`lnsTableCell ${alignmentClassName}`}
      />
    );
  };
};
