/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataMinMax, roundValue } from '../../utils';

import type { ColorRange, DataBounds } from '../types';
import type { CustomPaletteParamsConfig } from '../../../../../common';
import type { PaletteContinuity } from '../../../../../../../../src/plugins/charts/common';

/**
 * Distribute equally
 * @internal
 */
export const distributeEqually = (
  colorRanges: ColorRange[],
  rangeType: CustomPaletteParamsConfig['rangeType'],
  continuity: PaletteContinuity,
  dataBounds: DataBounds
) => {
  const items = colorRanges.length;
  const lastIndex = colorRanges.length - 1;
  const { min, max } = getDataMinMax(rangeType, dataBounds);
  const step = roundValue((max - min) / items, rangeType === 'percent' ? 0 : 2);

  const getValueForIndex = (index: number) => roundValue(min + (step * 100 * index) / 100);
  const getStartValue = (index: number) => {
    if (index === 0) {
      return ['all', 'below'].includes(continuity) ? -Infinity : min;
    }
    return getValueForIndex(index);
  };
  const getEndValue = (index: number) => {
    if (index === lastIndex) {
      return ['all', 'above'].includes(continuity) ? Infinity : max;
    }
    return getValueForIndex(index + 1);
  };

  return colorRanges.map((colorRange, index) => ({
    color: colorRange.color,
    start: getStartValue(index),
    end: getEndValue(index),
  }));
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
