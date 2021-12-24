/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDataMinMax, roundValue } from '../utils';

import type { ColorRange, DataBounds, ColorRangeAccessor } from './types';
import type { CustomPaletteParamsConfig } from '../../../../common';
import { PaletteContinuity } from '../../../../../../../src/plugins/charts/common';

/**
 * Check if item is last
 * @internal
 */
export const isLastItem = (accessor: ColorRangeAccessor) => accessor === 'end';

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

  let insertEnd = Math.min(lastStart + step, max);

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
 * Sort Color ranges array
 * @internal
 */
export const sortColorRanges = (colorRanges: ColorRange[]) => {
  const maxValue = colorRanges[colorRanges.length - 1].end;

  return [...colorRanges]
    .sort(({ start: startA }, { start: startB }) => Number(startA) - Number(startB))
    .map((newColorRange, i, array) => ({
      color: newColorRange.color,
      start: newColorRange.start,
      end: i !== array.length - 1 ? array[i + 1].start : maxValue,
    }));
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
 * Reverse Palette
 * @internal
 */
export const reversePalette = (colorRanges: ColorRange[]) => {
  return colorRanges
    .map(({ color }, i) => ({
      color,
      start: colorRanges[colorRanges.length - i - 1].start,
      end: colorRanges[colorRanges.length - i - 1].end,
    }))
    .reverse();
};

/**
 * Update ColorRange color
 * @internal
 */
export const updateColorRangeColor = (index: number, color: string, colorRanges: ColorRange[]) => {
  colorRanges[index].color = color;
  return [...colorRanges];
};

/**
 * Distribute equally
 * @internal
 */
export const distributeEqually = (
  colorRanges: ColorRange[],
  rangeType: CustomPaletteParamsConfig['rangeType'],
  dataBounds: DataBounds
) => {
  const colorsCount = colorRanges.length;
  const lastIndex = colorRanges.length - 1;

  const { min, max } = getDataMinMax(rangeType, dataBounds);
  const step = roundValue((max - min) / colorsCount);

  return colorRanges.map((colorRange, index) => ({
    color: colorRange.color,
    start: roundValue(min + (step * 100 * index) / 100),
    end: index === lastIndex ? max : roundValue(min + (step * 100 * (index + 1)) / 100),
  }));
};

/**
 * Caclulate max step
 * @internal
 */
export const calculateMaxStep = (stops: number[], max: number) => {
  let step = 1;

  if (stops.length > 1) {
    const last = stops[stops.length - 1];
    const last2step = stops[stops.length - 1] - stops[stops.length - 2];

    if (last + last2step < max) {
      step = last2step;
    }
  }

  return step;
};

/**
 * Convert ColorRange to ColorStops
 * @internal
 */
export const toColorStops = (colorRanges: ColorRange[], continuity: PaletteContinuity) => {
  const min = ['below', 'all'].includes(continuity!) ? -Infinity : colorRanges[0].start;
  const max = ['above', 'all'].includes(continuity!)
    ? Infinity
    : colorRanges[colorRanges.length - 1].end;

  return {
    min,
    max,
    colorStops: colorRanges.map((colorRange, i) => ({
      color: colorRange.color,
      stop: i === 0 ? min : colorRange.start,
    })),
  };
};
