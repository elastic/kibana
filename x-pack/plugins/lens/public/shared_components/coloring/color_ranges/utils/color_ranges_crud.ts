/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDataMinMax, roundValue } from '../../utils';

import type { ColorRange, ColorRangeAccessor } from '../types';
import type { DataBounds } from '../../types';
import type { CustomPaletteParamsConfig } from '../../../../../common';

/**
 * Allows to update a ColorRange
 * @private
 */
const updateColorRangeItem = (
  colorRanges: ColorRange[],
  index: number,
  payload: Partial<ColorRange>
): ColorRange[] => {
  const ranges = [...colorRanges];
  ranges[index] = { ...ranges[index], ...payload };
  return ranges;
};

/**
 * Add new color range after the last item
 * @internal
 */
export const addColorRange = (
  colorRanges: ColorRange[],
  rangeType: CustomPaletteParamsConfig['rangeType'],
  dataBounds: DataBounds
) => {
  let newColorRanges = [...colorRanges];
  const lastIndex = newColorRanges.length - 1;
  const lastStart = newColorRanges[lastIndex].start;
  const lastEnd = newColorRanges[lastIndex].end;
  const lastColor = newColorRanges[lastIndex].color;

  const { max: dataMax } = getDataMinMax(rangeType, dataBounds);
  const max = Math.max(dataMax, lastEnd);

  let insertEnd = roundValue(Math.min(lastStart + 1, max));

  if (insertEnd === Number.NEGATIVE_INFINITY) {
    insertEnd = 1;
  }

  newColorRanges = updateColorRangeItem(newColorRanges, lastIndex, { end: insertEnd });
  newColorRanges.push({
    color: lastColor,
    start: insertEnd,
    end: lastEnd === insertEnd ? lastEnd + 1 : lastEnd,
  });

  return newColorRanges;
};

/**
 * Delete ColorRange
 * @internal
 */
export const deleteColorRange = (index: number, colorRanges: ColorRange[]) => {
  const lastIndex = colorRanges.length - 1;
  let ranges = colorRanges;

  if (index !== 0) {
    if (index !== lastIndex) {
      ranges = updateColorRangeItem(ranges, index - 1, { end: ranges[index + 1].start });
    }
    if (index === lastIndex) {
      ranges = updateColorRangeItem(ranges, index - 1, { end: colorRanges[index].end });
    }
  }
  return ranges.filter((item, i) => i !== index);
};

/**
 * Update ColorRange value
 * @internal
 */
export const updateColorRangeValue = (
  index: number,
  value: string,
  accessor: ColorRangeAccessor,
  colorRanges: ColorRange[]
) => {
  const parsedValue = value ? parseFloat(value) : Number.NaN;
  let ranges = colorRanges;

  if (accessor === 'end') {
    ranges = updateColorRangeItem(ranges, index, { end: parsedValue });
  } else {
    ranges = updateColorRangeItem(ranges, index, { start: parsedValue });
    if (index > 0) {
      ranges = updateColorRangeItem(ranges, index - 1, { end: parsedValue });
    }
  }
  return ranges;
};

/**
 * Update ColorRange color
 * @internal
 */
export const updateColorRangeColor = (index: number, color: string, colorRanges: ColorRange[]) =>
  updateColorRangeItem(colorRanges, index, { color });
