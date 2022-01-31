/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { getDataMinMax, isValidColor } from '../utils';

import type { ColorRange, ColorRangeAccessor } from './types';
import type { DataBounds } from '../types';

import { CustomPaletteParams } from '../../../../common';

/** @internal **/
type ColorRangeValidationErrors = 'invalidColor' | 'invalidValue' | 'greaterThanMaxValue';

/** @internal **/
type ColorRangeValidationWarnings = 'lowerThanDataBounds' | 'greaterThanDataBounds';

/** @internal **/
export interface ColorRangeValidation {
  errors: ColorRangeValidationErrors[];
  warnings: ColorRangeValidationWarnings[];
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
                defaultMessage: 'Maximum value should be greater than preceding values',
              });
            default:
              return '';
          }
        })
    ),
  ];
};

export const getOutsideDataBoundsWarningMessage = (warnings: ColorRangeValidation['warnings']) => {
  for (const warning of warnings) {
    switch (warning) {
      case 'lowerThanDataBounds':
        return i18n.translate('xpack.lens.dynamicColoring.customPalette.lowerThanDataBounds', {
          defaultMessage: 'This value is outside the minimum data bound',
        });
      case 'greaterThanDataBounds':
        return i18n.translate('xpack.lens.dynamicColoring.customPalette.greaterThanDataBounds', {
          defaultMessage: 'This value is outside the maximum data bound',
        });
    }
  }
};

const checkForComplianceWithDataBounds = (value: number, minMax?: [number, number]) => {
  const warnings: ColorRangeValidationWarnings[] = [];
  if (minMax) {
    const [min, max] = minMax;

    if (value < min) {
      warnings.push('lowerThanDataBounds');
    }
    if (value > max) {
      warnings.push('greaterThanDataBounds');
    }
  }

  return warnings;
};

/** @internal **/
export const validateColorRange = (
  colorRange: ColorRange,
  accessor: ColorRangeAccessor,
  minMax?: [number, number]
) => {
  const errors: ColorRangeValidationErrors[] = [];
  let warnings: ColorRangeValidationWarnings[] = [];

  if (Number.isNaN(colorRange[accessor])) {
    errors.push('invalidValue');
  }

  if (accessor === 'end') {
    if (colorRange.start > colorRange.end) {
      errors.push('greaterThanMaxValue');
    }
    warnings = [...warnings, ...checkForComplianceWithDataBounds(colorRange.end, minMax)];
  } else {
    if (!isValidColor(colorRange.color)) {
      errors.push('invalidColor');
    }
    warnings = [...warnings, ...checkForComplianceWithDataBounds(colorRange.start, minMax)];
  }

  return {
    isValid: !errors.length,
    errors,
    warnings,
  } as ColorRangeValidation;
};

export const validateColorRanges = (
  colorRanges: ColorRange[],
  dataBounds: DataBounds,
  rangeType: CustomPaletteParams['rangeType']
): Record<string, ColorRangeValidation> => {
  let minMax: [number, number] | undefined;

  if ((dataBounds.fallback && rangeType === 'percent') || !dataBounds.fallback) {
    const { min, max } = getDataMinMax(rangeType, dataBounds);
    minMax = [min, max];
  }

  const validations = colorRanges.reduce<Record<string, ColorRangeValidation>>(
    (acc, item, index) => ({
      ...acc,
      [index]: validateColorRange(item, 'start', minMax),
    }),
    {}
  );

  return {
    ...validations,
    last: validateColorRange(colorRanges[colorRanges.length - 1], 'end', minMax),
  };
};

export const isAllColorRangesValid = (
  colorRanges: ColorRange[],
  dataBounds: DataBounds,
  rangeType: CustomPaletteParams['rangeType']
) => {
  return Object.values(validateColorRanges(colorRanges, dataBounds, rangeType)).every(
    (colorRange) => colorRange.isValid
  );
};
