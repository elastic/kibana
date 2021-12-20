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

import type { DataBounds, ColorRangeValidation } from './types';

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

export const updateColor = (index: number, color: string, colorRanges: ColorRange[]) => {
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

export const validateColorRanges = (colorRanges: ColorRange[]) => {
  const validate = ({ end, start, color }: ColorRange, isLast: boolean) => {
    const errors: string[] = [];
    const value = isLast ? end : start;
    if (!isValidColor(color)) {
      errors.push(
        i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidColorValue', {
          defaultMessage: `Invalid color value.`,
        })
      );
    }

    // todo: isLast?
    if (Number.isNaN(value) && !isLast) {
      errors.push(
        i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidValue', {
          defaultMessage: `The number value is required.`,
        })
      );
    }

    return {
      isValid: !errors.length,
      errors,
    };
  };

  return colorRanges.reduce<Record<string, ColorRangeValidation>>(
    (acc, item, index, array) => ({
      ...acc,
      [index]: validate(item, false),
    }),
    {}
  );
};
