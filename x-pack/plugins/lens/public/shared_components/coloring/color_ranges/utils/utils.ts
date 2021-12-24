/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { roundValue } from '../../utils';

import type { ColorRange, ColorRangeAccessor } from '../types';
import type { PaletteContinuity } from '../../../../../../../../src/plugins/charts/common';

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
