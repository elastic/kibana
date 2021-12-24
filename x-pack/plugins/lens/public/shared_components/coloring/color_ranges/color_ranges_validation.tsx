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
export interface ColorRangeValidation {
  errors: Array<'invalidColor' | 'invalidValue' | 'greaterThanMaxValue'>;
  isValid: boolean;
}

/** @internal **/
export const getErrorMessages = (colorRangesValidity: Record<string, ColorRangeValidation>) => {
  return [
    ...new Set(
      Object.values(colorRangesValidity)
        .reduce<ColorRangeValidation['errors']>((acc, item) => [...acc, ...item.errors], [])
        .flat()
    ),
  ].map((item) => {
    switch (item) {
      case 'invalidColor':
      case 'invalidValue':
        return i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidValueOrColor', {
          defaultMessage: 'At least one color range contains the wrong value or color',
        });
      case 'greaterThanMaxValue':
        return i18n.translate('xpack.lens.dynamicColoring.customPalette.invalidMaxValue', {
          defaultMessage: 'Maximum value should be greater than preceding values',
        });
      default:
        return '';
    }
  });
};

/** @internal **/
export const validateColorRange = (
  colorRange: ColorRange,
  accessor: ColorRangeAccessor
): ColorRangeValidation => {
  const errors: ColorRangeValidation['errors'] = [];

  if (Number.isNaN(colorRange[accessor])) {
    errors.push('invalidValue');
  }

  if (accessor === 'end') {
    if (colorRange.start > colorRange.end) {
      errors.push('greaterThanMaxValue');
    }
  } else {
    if (!isValidColor(colorRange.color)) {
      errors.push('invalidColor');
    }
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
      [index]: validateColorRange(item, 'start'),
    }),
    {}
  );

  return {
    ...validations,
    last: validateColorRange(colorRanges[colorRanges.length - 1], 'end'),
  };
};
