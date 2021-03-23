/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import chroma from 'chroma-js';
import { CustomPaletteState } from 'src/plugins/charts/common';
import type { FormatFactory } from '../../types';
import type { DataContextType } from './types';
import { ColumnConfig } from './table_basic';

function findColorBucketed(
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
  // in case of shorter rangers, extends the steps on the sides to cover the whole set
  if (comparison(value, maxValue) > 0) {
    return colors[colors.length - 1];
  }
  if (comparison(value, minValue) < 0) {
    return colors[0];
  }
  // what about values in range
  return colors.find((c, i) => comparison(value, minValue + (1 + i) * step) <= 0) || '';
}

function findColorsByStops(
  value: number,
  { min, max }: { min: number; max: number },
  comparison: (value: number, bucket: number) => number,
  colors: string[],
  stops: number[],
  rangeMin?: number,
  rangeMax?: number
) {
  const maxValue = rangeMax ?? max;
  const minValue = rangeMin ?? min;

  if (comparison(value, (maxValue / max) * 100) > 0) {
    return colors[colors.length - 1];
  }
  if (comparison(value, (minValue / min) * 100) < 0) {
    return colors[0];
  }

  return colors.find((c, i) => comparison(value, stops[i]) <= 0) || '';
}

function workoutColorForCell(
  value: number,
  { colors, stops, range, rangeMin, rangeMax, gradient }: CustomPaletteState,
  minMax: { min: number; max: number }
) {
  if (value == null) {
    return '';
  }

  const interval = minMax.max - minMax.min;
  const extraRangeArguments = range === 'auto' ? [] : [rangeMin, rangeMax];
  const comparisonFn =
    range === 'percent'
      ? (v: number, threshold: number) => (v - minMax.min) / interval - threshold / 100
      : (v: number, threshold: number) => v - threshold;

  if (stops.length) {
    return findColorsByStops(
      value,
      minMax,
      // TODO: handle the case of percentage ranges here
      (v: number, threshold: number) => (v - minMax.min) / interval - threshold / 100,
      colors,
      stops,
      ...extraRangeArguments
    );
  }

  return findColorBucketed(value, minMax, comparisonFn, colors, ...extraRangeArguments);
}

function getHighContrastText(background: string, light: string = '#FFF', dark: string = '#333') {
  try {
    return chroma.contrast(background, '#000') < 7 ? light : dark;
  } catch (e) {
    return dark;
  }
}

export const createGridCell = (
  formatters: Record<string, ReturnType<FormatFactory>>,
  columnConfig: ColumnConfig,
  DataContext: React.Context<DataContextType>
) => ({ rowIndex, columnId, setCellProps }: EuiDataGridCellValueElementProps) => {
  const { table, alignments, minMaxByColumnId } = useContext(DataContext);
  const rowValue = table?.rows[rowIndex][columnId];
  const content = formatters[columnId]?.convert(rowValue, 'html');
  const currentAlignment = alignments && alignments[columnId];
  const alignmentClassName = `lnsTableCell--${currentAlignment}`;

  const { colorMode, palette } =
    columnConfig.columns.find(({ columnId: id }) => id === columnId) || {};
  useEffect(() => {
    if (minMaxByColumnId?.[columnId]) {
      if (colorMode !== 'none' && palette?.params) {
        // workout the bucket the value belongs to
        const color = workoutColorForCell(rowValue, palette.params, minMaxByColumnId[columnId]);
        const style = { [colorMode === 'cell' ? 'backgroundColor' : 'color']: color };
        if (colorMode === 'cell') {
          style.color = getHighContrastText(color);
        }
        return setCellProps({
          style,
        });
      } else {
        // make sure to clean it up
        return setCellProps({
          style: {},
        });
      }
    }
  }, [rowValue, columnId, setCellProps, colorMode, palette, minMaxByColumnId]);

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
