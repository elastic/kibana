/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataMinMax, roundValue } from '../../utils';

import type { ColorRange } from '../types';
import type { DataBounds } from '../../types';
import type { CustomPaletteParamsConfig } from '../../../../../common';
import {
  PaletteContinuity,
  checkIsMinContinuity,
  checkIsMaxContinuity,
} from '../../../../../../../../src/plugins/charts/common';

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
  const step = roundValue((max - min) / items);

  const getValueForIndex = (index: number) => roundValue(min + step * index);
  const getStartValue = (index: number) => {
    if (index === 0) {
      return checkIsMinContinuity(continuity) ? Number.NEGATIVE_INFINITY : roundValue(min);
    }
    return getValueForIndex(index);
  };
  const getEndValue = (index: number) => {
    if (index === lastIndex) {
      return checkIsMaxContinuity(continuity) ? Number.POSITIVE_INFINITY : roundValue(max);
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
export const reversePalette = (colorRanges: ColorRange[]) =>
  colorRanges
    .map(({ color }, i) => ({
      color,
      start: colorRanges[colorRanges.length - i - 1].start,
      end: colorRanges[colorRanges.length - i - 1].end,
    }))
    .reverse();
