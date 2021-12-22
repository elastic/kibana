/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDataMinMax, isValidColor, roundValue } from '../utils';

import type { ColorRange, DataBounds, ColorRangeValidation, ColorRangeAccessor } from './types';
import type { CustomPaletteParamsConfig } from '../../../../common';

export const isLastItem = (accessor: ColorRangeAccessor) => accessor === 'end';

export const reversePalette = (colorRanges: ColorRange[]) => {
  return colorRanges
    .map(({ color }, i) => ({
      color,
      start: colorRanges[colorRanges.length - i - 1].start,
      end: colorRanges[colorRanges.length - i - 1].end,
    }))
    .reverse();
};

export const addColorRange = (
  colorRanges: ColorRange[],
  rangeType: CustomPaletteParamsConfig['rangeType'],
  dataBounds: DataBounds
) => {
  const newColorRanges = [...colorRanges];
  const { max } = getDataMinMax(rangeType, dataBounds);
  const lastIndex = newColorRanges.length - 1;

  const step = calculateMaxStep(
    newColorRanges.map((item) => item.start),
    max
  );

  const lastStart = newColorRanges[lastIndex].start;
  const lastEnd = newColorRanges[lastIndex].end;
  const lastColor = newColorRanges[lastIndex].color;

  let insertEnd = Math.min(lastStart + step, max);

  if (insertEnd === -Infinity) {
    insertEnd = 1;
  }

  newColorRanges[lastIndex].end = insertEnd;

  newColorRanges.push({
    color: lastColor,
    start: insertEnd,
    end: lastEnd,
  });
  return newColorRanges;
};

export const sortColorRanges = (colorRanges: ColorRange[]) => {
  const maxValue = colorRanges[colorRanges.length - 1].end;

  const newColorRanges = [...colorRanges]
    .sort(({ start: startA }, { start: startB }) => Number(startA) - Number(startB))
    .map((newColorRange, i, array) => ({
      color: newColorRange.color,
      start: newColorRange.start,
      end: i !== array.length - 1 ? array[i + 1].start : maxValue,
    }));

  const lastRange = newColorRanges[newColorRanges.length - 1];

  if (lastRange.start > lastRange.end) {
    const oldEnd = lastRange.end;
    lastRange.end = lastRange.start;
    lastRange.start = oldEnd;
  }

  return newColorRanges;
};

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

export const updateColorRangeColor = (index: number, color: string, colorRanges: ColorRange[]) => {
  colorRanges[index].color = color;
  return [...colorRanges];
};

export const distributeEqually = (
  colorRanges: ColorRange[],
  rangeType: CustomPaletteParamsConfig['rangeType'],
  dataBounds: DataBounds
) => {
  const colorsCount = colorRanges.length;
  const { min, max } = getDataMinMax(rangeType, dataBounds);
  const step = roundValue((max - min) / colorsCount);

  return colorRanges.map((colorRange, index) => ({
    color: colorRange.color,
    start: roundValue(min + (step * 100 * index) / 100),
    end:
      index === colorRanges.length - 1 ? max : roundValue(min + (step * 100 * (index + 1)) / 100),
  }));
};

export const validateСolorRange = (
  colorRange: ColorRange,
  accessor: ColorRangeAccessor
): ColorRangeValidation => {
  const errors: ColorRangeValidation['errors'] = [];
  const validateStartColorRange = ({ start, color }: ColorRange) => {
    if (!isValidColor(color)) {
      errors.push('invalidColor');
    }

    if (Number.isNaN(start)) {
      errors.push('invalidValue');
    }
  };

  const validateEndRange = ({ end, start }: ColorRange) => {
    if (start > end) {
      errors.push('greaterThanMaxValue');
    }
  };

  if (accessor === 'end') {
    validateEndRange(colorRange);
  } else {
    validateStartColorRange(colorRange);
  }

  return {
    isValid: !errors.length,
    errors,
  };
};

export const validateColorRanges = (colorRanges: ColorRange[]) => {
  const validations = colorRanges.reduce<Record<string, ColorRangeValidation>>(
    (acc, item, index, array) => ({
      ...acc,
      [index]: validateСolorRange(item, 'start'),
    }),
    {}
  );

  return {
    ...validations,
    last: validateСolorRange(colorRanges[colorRanges.length - 1], 'end'),
  };
};

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
