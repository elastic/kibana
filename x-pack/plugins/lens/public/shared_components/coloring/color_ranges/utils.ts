/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlIdGenerator } from '@elastic/eui';
import { ColorRange } from '.';
import { getDataMinMax, getStepValue, roundValue } from '../utils';
import { DEFAULT_COLOR } from '../constants';
import { DataBounds } from './types';

const idGeneratorFn = htmlIdGenerator();

export const reversePalette = (colorRanges: ColorRange[]) => {
  return colorRanges
    .map(({ color }, i) => ({
      id: idGeneratorFn(),
      color,
      start: colorRanges[colorRanges.length - i - 1].start,
      end: colorRanges[colorRanges.length - i - 1].end,
    }))
    .reverse();
};

export const addColorRange = (
  colorRanges: ColorRange[],
  rangeType: 'number' | 'percent',
  dataBounds: DataBounds
) => {
  const newColorRanges = [...colorRanges];
  const length = newColorRanges.length;
  const { max } = getDataMinMax(rangeType, dataBounds);
  const step = getStepValue(
    colorRanges.map(({ color, start }) => ({ color, stop: Number(start) })),
    newColorRanges.map(({ color, start }) => ({ color, stop: Number(start) })),
    max
  );
  const prevColor = colorRanges[length - 1].color || DEFAULT_COLOR;
  const newStart = step + Number(colorRanges[length - 1].start);
  const prevEndValue = newColorRanges[length - 1].end;

  newColorRanges[length - 1].end = newStart;
  newColorRanges.push({
    id: idGeneratorFn(),
    color: prevColor,
    start: newStart,
    end:
      newStart < prevEndValue
        ? prevEndValue
        : dataBounds.max > newStart
        ? dataBounds.max
        : newStart + step,
  });

  return newColorRanges;
};

export const deleteColorRange = (index: number, colorRanges: ColorRange[]) => {
  if (index !== 0 && index !== colorRanges.length - 1) {
    colorRanges[index - 1].end = colorRanges[index + 1].start;
  }

  return colorRanges.filter((item, i) => i !== index);
};

export const distributeEqually = (colorRanges: ColorRange[]) => {
  const colorsCount = colorRanges.length;
  const start = colorRanges[0].start;
  const end = colorRanges[colorsCount - 1].end;
  const step = roundValue((end - start) / colorsCount);

  return colorRanges.map((colorRange, index) => ({
    id: idGeneratorFn(),
    color: colorRange.color,
    start: roundValue(start + (step * 100 * index) / 100),
    end:
      index === colorRanges.length - 1 ? end : roundValue(start + (step * 100 * (index + 1)) / 100),
  }));
};
