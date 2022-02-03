/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { isValidColor } from '../utils';

import type { ColorRange, ColorRangeAccessor } from './types';

/** @internal **/
type ColorRangeValidationErrors = 'invalidColor' | 'invalidValue' | 'greaterThanMaxValue';

/** @internal **/
export interface ColorRangeValidation {
  errors: ColorRangeValidationErrors[];
  isValid: boolean;
}

/** @internal **/
export const getErrorMessages = (colorRangesValidity: Record<string, ColorRangeValidation>) => {
  return [
    ...new Set(
      Object.values(colorRangesValidity)
        .map((item) => item.errors)
        .flat()
        .map((item) => {
          switch (item) {
            case 'invalidColor':
            case 'invalidValue':
              return i18n.translate(
                'xpack.lens.dynamicColoring.customPalette.invalidValueOrColor',
                {
                  defaultMessage: 'At least one color range contains the wrong value or color',
                }
              );
            case 'greaterThanMaxValue':
              return i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidMaxValue', {
                defaultMessage: 'Maximum value must be greater than preceding values',
              });
            default:
              return '';
          }
        })
    ),
  ];
};

/** @internal **/
export const validateColorRange = (colorRange: ColorRange, accessor: ColorRangeAccessor) => {
  const errors: ColorRangeValidationErrors[] = [];

  if (Number.isNaN(colorRange[accessor])) {
    errors.push('invalidValue');
  }

  if (accessor === 'end') {
    if (colorRange.start > colorRange.end) {
      errors.push('greaterThanMaxValue');
    }
  } else if (!isValidColor(colorRange.color)) {
    errors.push('invalidColor');
  }

  return {
    isValid: !errors.length,
    errors,
  } as ColorRangeValidation;
};

export const validateColorRanges = (
  colorRanges: ColorRange[]
): Record<string, ColorRangeValidation> => {
  const validations = colorRanges.reduce<Record<string, ColorRangeValidation>>(
    (acc, item, index) => ({
      ...acc,
      [index]: validateColorRange(item, 'start'),
    }),
    {}
  );

  return {
    ...validations,
    last: validateColorRange(colorRanges[colorRanges.length - 1], 'end'),
  };
};

export const isAllColorRangesValid = (colorRanges: ColorRange[]) => {
  return Object.values(validateColorRanges(colorRanges)).every((colorRange) => colorRange.isValid);
};
