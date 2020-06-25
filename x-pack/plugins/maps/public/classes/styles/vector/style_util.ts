/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { MB_LOOKUP_FUNCTION, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { Category } from '../../../../common/descriptor_types';

export function getOtherCategoryLabel() {
  return i18n.translate('xpack.maps.styles.categorical.otherCategoryLabel', {
    defaultMessage: 'Other',
  });
}

export function getComputedFieldName(styleName: string, fieldName: string) {
  return `${getComputedFieldNamePrefix(fieldName)}__${styleName}`;
}

export function getComputedFieldNamePrefix(fieldName: string) {
  return `__kbn__dynamic__${fieldName}`;
}

export function isOnlySingleFeatureType(
  featureType: VECTOR_SHAPE_TYPE,
  supportedFeatures: VECTOR_SHAPE_TYPE[],
  hasFeatureType: { [key in keyof typeof VECTOR_SHAPE_TYPE]: boolean }
): boolean {
  if (supportedFeatures.length === 1) {
    return supportedFeatures[0] === featureType;
  }

  const featureTypes = Object.keys(hasFeatureType);
  // @ts-expect-error
  return featureTypes.reduce((accumulator: boolean, featureTypeKey: VECTOR_SHAPE_TYPE) => {
    const hasFeature = hasFeatureType[featureTypeKey];
    return featureTypeKey === featureType ? accumulator && hasFeature : accumulator && !hasFeature;
  }, true);
}

export function dynamicRound(value: number | string) {
  if (typeof value !== 'number') {
    return value;
  }

  let precision = 0;
  let threshold = 10;
  while (value < threshold && precision < 8) {
    precision++;
    threshold = threshold / 10;
  }

  return precision === 0 ? Math.round(value) : parseFloat(value.toFixed(precision + 1));
}

export function assignCategoriesToPalette({
  categories,
  paletteValues,
}: {
  categories: Category[];
  paletteValues: string[];
}) {
  const stops = [];
  let fallbackSymbolId = null;

  if (categories.length && paletteValues.length) {
    const maxLength = Math.min(paletteValues.length, categories.length + 1);
    fallbackSymbolId = paletteValues[maxLength - 1];
    for (let i = 0; i < maxLength - 1; i++) {
      stops.push({
        stop: categories[i].key,
        style: paletteValues[i],
      });
    }
  }

  return {
    stops,
    fallbackSymbolId,
  };
}

export function makeMbClampedNumberExpression({
  lookupFunction,
  fieldName,
  minValue,
  maxValue,
  fallback,
}: {
  lookupFunction: MB_LOOKUP_FUNCTION;
  fieldName: string;
  minValue: number;
  maxValue: number;
  fallback: number;
}) {
  const clamp = ['max', ['min', ['to-number', [lookupFunction, fieldName]], maxValue], minValue];
  return [
    'coalesce',
    [
      'case',
      ['==', [lookupFunction, fieldName], null],
      minValue - 1, // == does a JS-y like check where returns true for null and undefined
      clamp,
    ],
    fallback,
  ];
}
