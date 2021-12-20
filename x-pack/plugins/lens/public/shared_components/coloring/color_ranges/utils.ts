/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ColorRange } from '.';
import { getDataMinMax, getStepValue, isValidColor, roundValue } from '../utils';

import { DEFAULT_COLOR } from '../constants';

import type { DataBounds, ColorRangeValidation, ColorRangeAccessor } from './types';
import type { CustomPaletteParamsConfig } from '../../../../common';

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

export const deleteColorRange = (index: number, colorRanges: ColorRange[]) => {
  if (index !== 0 && index !== colorRanges.length - 1) {
    colorRanges[index - 1].end = colorRanges[index + 1].start;
  }

  return colorRanges.filter((item, i) => i !== index);
};

export const updateColorRangeValue = (
  index: number,
  value: string,
  accessor: 'start' | 'end',
  colorRanges: ColorRange[]
) => {
  const parsedValue = parseFloat(value);

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

export const distributeEqually = (colorRanges: ColorRange[]) => {
  const colorsCount = colorRanges.length;
  const start = colorRanges[0].start;
  const end = colorRanges[colorsCount - 1].end;
  const step = roundValue((end - start) / colorsCount);

  return colorRanges.map((colorRange, index) => ({
    color: colorRange.color,
    start: roundValue(start + (step * 100 * index) / 100),
    end:
      index === colorRanges.length - 1 ? end : roundValue(start + (step * 100 * (index + 1)) / 100),
  }));
};

export const validateСolorRange = (colorRange: ColorRange, accessor: ColorRangeAccessor) => {
  const errors: string[] = [];
  const validateStartColorRange = ({ start, color }: ColorRange) => {
    if (!isValidColor(color)) {
      errors.push(
        i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidColorValue', {
          defaultMessage: `Invalid color value.`,
        })
      );
    }

    if (Number.isNaN(start)) {
      errors.push(
        i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidValue', {
          defaultMessage: `The number value is required.`,
        })
      );
    }
  };

  const validateEndRange = ({ end, start }: ColorRange) => {
    if (start > end) {
      errors.push(
        i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidMaxValue', {
          defaultMessage: 'Maximum value should be greater than preceding values',
        })
      );
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
