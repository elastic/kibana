/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { roundValue, getDataMinMax } from '../../utils';
import {
  PaletteContinuity,
  checkIsMaxContinuity,
  checkIsMinContinuity,
} from '../../../../../../../../src/plugins/charts/common';
import type { CustomPaletteParams } from '../../../../../common';
import type { ColorRange, ColorRangeAccessor } from '../types';
import type { DataBounds } from '../../types';

/**
 * Check if item is last
 * @internal
 */
export const isLastItem = (accessor: ColorRangeAccessor) => accessor === 'end';

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
 * Calculate max step
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
  return roundValue(step);
};

/**
 * Convert ColorRange to ColorStops
 * @internal
 */

export const toColorStops = (colorRanges: ColorRange[], continuity: PaletteContinuity) => {
  const min = checkIsMinContinuity(continuity) ? Number.NEGATIVE_INFINITY : colorRanges[0].start;
  const max = checkIsMaxContinuity(continuity)
    ? Number.POSITIVE_INFINITY
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

/**
 * Calculate right max or min value for new continuity
 */

export const getValueForContinuity = (
  colorRanges: ColorRange[],
  continuity: PaletteContinuity,
  isLast: boolean,
  rangeType: CustomPaletteParams['rangeType'],
  dataBounds: DataBounds
) => {
  const { max, min } = getDataMinMax(rangeType, dataBounds);
  let value;
  if (isLast) {
    if (checkIsMaxContinuity(continuity)) {
      value = Number.POSITIVE_INFINITY;
    } else {
      value =
        colorRanges[colorRanges.length - 1].start > max
          ? colorRanges[colorRanges.length - 1].start + 1
          : max;
    }
  } else {
    if (checkIsMinContinuity(continuity)) {
      value = Number.NEGATIVE_INFINITY;
    } else {
      value = colorRanges[0].end < min ? colorRanges[0].end - 1 : min;
    }
  }

  return value;
};
