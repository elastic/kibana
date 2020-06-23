/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isOnlySingleFeatureType, assignCategoriesToPalette, dynamicRound } from './style_util';
import { VECTOR_SHAPE_TYPES } from '../../sources/vector_feature_types';

describe('isOnlySingleFeatureType', () => {
  describe('source supports single feature type', () => {
    const supportedFeatures = [VECTOR_SHAPE_TYPES.POINT];

    test('Is only single feature type when only supported feature type is target feature type', () => {
      expect(isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.POINT, supportedFeatures)).toBe(true);
    });

    test('Is not single feature type when only supported feature type is not target feature type', () => {
      expect(isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.LINE, supportedFeatures)).toBe(false);
    });
  });

  describe('source supports multiple feature types', () => {
    const supportedFeatures = [
      VECTOR_SHAPE_TYPES.POINT,
      VECTOR_SHAPE_TYPES.LINE,
      VECTOR_SHAPE_TYPES.POLYGON,
    ];

    test('Is only single feature type when data only has target feature type', () => {
      const hasFeatureType = {
        [VECTOR_SHAPE_TYPES.POINT]: true,
        [VECTOR_SHAPE_TYPES.LINE]: false,
        [VECTOR_SHAPE_TYPES.POLYGON]: false,
      };
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.POINT, supportedFeatures, hasFeatureType)
      ).toBe(true);
    });

    test('Is not single feature type when data has multiple feature types', () => {
      const hasFeatureType = {
        [VECTOR_SHAPE_TYPES.POINT]: true,
        [VECTOR_SHAPE_TYPES.LINE]: true,
        [VECTOR_SHAPE_TYPES.POLYGON]: true,
      };
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.LINE, supportedFeatures, hasFeatureType)
      ).toBe(false);
    });

    test('Is not single feature type when data does not have target feature types', () => {
      const hasFeatureType = {
        [VECTOR_SHAPE_TYPES.POINT]: false,
        [VECTOR_SHAPE_TYPES.LINE]: true,
        [VECTOR_SHAPE_TYPES.POLYGON]: false,
      };
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPES.POINT, supportedFeatures, hasFeatureType)
      ).toBe(false);
    });
  });
});

describe('assignCategoriesToPalette', () => {
  test('Categories and palette values have same length', () => {
    const categories = [{ key: 'alpah' }, { key: 'bravo' }, { key: 'charlie' }, { key: 'delta' }];
    const paletteValues = ['red', 'orange', 'yellow', 'green'];
    expect(assignCategoriesToPalette({ categories, paletteValues })).toEqual({
      stops: [
        { stop: 'alpah', style: 'red' },
        { stop: 'bravo', style: 'orange' },
        { stop: 'charlie', style: 'yellow' },
      ],
      fallback: 'green',
    });
  });

  test('Should More categories than palette values', () => {
    const categories = [{ key: 'alpah' }, { key: 'bravo' }, { key: 'charlie' }, { key: 'delta' }];
    const paletteValues = ['red', 'orange', 'yellow'];
    expect(assignCategoriesToPalette({ categories, paletteValues })).toEqual({
      stops: [
        { stop: 'alpah', style: 'red' },
        { stop: 'bravo', style: 'orange' },
      ],
      fallback: 'yellow',
    });
  });

  test('Less categories than palette values', () => {
    const categories = [{ key: 'alpah' }, { key: 'bravo' }];
    const paletteValues = ['red', 'orange', 'yellow', 'green', 'blue'];
    expect(assignCategoriesToPalette({ categories, paletteValues })).toEqual({
      stops: [
        { stop: 'alpah', style: 'red' },
        { stop: 'bravo', style: 'orange' },
      ],
      fallback: 'yellow',
    });
  });
});

describe('dynamicRound', () => {
  test('Should truncate based on magnitude of number', () => {
    expect(dynamicRound(1000.1234)).toBe(1000);
    expect(dynamicRound(1.1234)).toBe(1.12);
    expect(dynamicRound(0.0012345678)).toBe(0.00123);
  });

  test('Should return argument when not a number', () => {
    expect(dynamicRound('foobar')).toBe('foobar');
  });
});
