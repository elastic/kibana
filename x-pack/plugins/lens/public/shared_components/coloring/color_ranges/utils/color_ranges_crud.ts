/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDataMinMax, roundValue } from '../../utils';
import { calculateMaxStep } from './utils';

import type { ColorRange, DataBounds, ColorRangeAccessor } from '../types';
import type { CustomPaletteParamsConfig } from '../../../../../common';

/**
 * Add new color range after the last item
 * @internal
 */
export const addColorRange = (
  colorRanges: ColorRange[],
  rangeType: CustomPaletteParamsConfig['rangeType'],
  dataBounds: DataBounds
) => {
  const newColorRanges = [...colorRanges];
  const lastIndex = newColorRanges.length - 1;
  const lastStart = newColorRanges[lastIndex].start;
  const lastEnd = newColorRanges[lastIndex].end;
  const lastColor = newColorRanges[lastIndex].color;

  const { max: dataMax } = getDataMinMax(rangeType, dataBounds);
  const max = Math.max(dataMax, lastEnd);

  const step = calculateMaxStep(
    newColorRanges.map((item) => item.start),
    max
  );

  let insertEnd = roundValue(Math.min(lastStart + step, max));

  if (insertEnd === -Infinity) {
    insertEnd = 1;
  }

  newColorRanges[lastIndex].end = insertEnd;

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

  if (index !== 0) {
    if (index !== lastIndex) {
      colorRanges[index - 1].end = colorRanges[index + 1].start;
    }
    if (index === lastIndex) {
      colorRanges[index - 1].end = colorRanges[index].end;
    }
  }

  return colorRanges.filter((item, i) => i !== index);
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

  if (accessor === 'end') {
    colorRanges[index].end = parsedValue;
  } else {
    colorRanges[index].start = parsedValue;
    if (index > 0) {
      colorRanges[index - 1].end = parsedValue;
    }
  }

  return [...colorRanges];
};

/**
 * Update ColorRange color
 * @internal
 */
export const updateColorRangeColor = (index: number, color: string, colorRanges: ColorRange[]) => {
  colorRanges[index].color = color;
  return [...colorRanges];
};
