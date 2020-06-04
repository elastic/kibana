/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export function getOtherCategoryLabel() {
  return i18n.translate('xpack.maps.styles.categorical.otherCategoryLabel', {
    defaultMessage: 'Other',
  });
}

export function getComputedFieldName(styleName, fieldName) {
  return `${getComputedFieldNamePrefix(fieldName)}__${styleName}`;
}

export function getComputedFieldNamePrefix(fieldName) {
  return `__kbn__dynamic__${fieldName}`;
}

export function isOnlySingleFeatureType(featureType, supportedFeatures, hasFeatureType) {
  if (supportedFeatures.length === 1) {
    return supportedFeatures[0] === featureType;
  }

  const featureTypes = Object.keys(hasFeatureType);
  return featureTypes.reduce((isOnlyTargetFeatureType, featureTypeKey) => {
    const hasFeature = hasFeatureType[featureTypeKey];
    return featureTypeKey === featureType
      ? isOnlyTargetFeatureType && hasFeature
      : isOnlyTargetFeatureType && !hasFeature;
  }, true);
}

export function dynamicRound(value) {
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

export function assignCategoriesToPalette({ categories, paletteValues }) {
  const stops = [];
  let fallback = null;

  if (categories && categories.length && paletteValues && paletteValues.length) {
    const maxLength = Math.min(paletteValues.length, categories.length + 1);
    fallback = paletteValues[maxLength - 1];
    for (let i = 0; i < maxLength - 1; i++) {
      stops.push({
        stop: categories[i].key,
        style: paletteValues[i],
      });
    }
  }

  return {
    stops,
    fallback,
  };
}

export function makeMbClampedNumberExpression({
  lookupFunction,
  fieldName,
  minValue,
  maxValue,
  fallback,
}) {
  const clamp = ['max', ['min', ['to-number', [lookupFunction, fieldName]], maxValue], minValue];
  return [
    'coalesce',
    [
      'case',
      ['==', [lookupFunction, fieldName], null],
      minValue - 1, //== does a JS-y like check where returns true for null and undefined
      clamp,
    ],
    fallback,
  ];
}
