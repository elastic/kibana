/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicSizeProperty } from './dynamic_size_property';
import { FIELD_ORIGIN, RawValue, VECTOR_STYLES } from '../../../../../../common/constants';
import { IField } from '../../../../fields/field';
import { IVectorLayer } from '../../../../layers/vector_layer';

describe('getMbSizeExpression - circle', () => {
  test('Should return interpolation expression with square-root function', async () => {
    const field = {
      isValid: () => {
        return true;
      },
      getName: () => {
        return 'foodbar';
      },
      getMbFieldName: () => {
        return 'foobar';
      },
      getOrigin: () => {
        return FIELD_ORIGIN.SOURCE;
      },
      getSource: () => {
        return {
          isMvt: () => {
            return false;
          },
        };
      },
      supportsFieldMetaFromEs: () => {
        return true;
      },
    } as unknown as IField;
    const iconSize = new DynamicSizeProperty(
      { minSize: 8, maxSize: 32, fieldMetaOptions: { isEnabled: true } },
      VECTOR_STYLES.ICON_SIZE,
      field,
      {} as unknown as IVectorLayer,
      () => {
        return (value: RawValue) => value + '_format';
      },
      false
    );
    iconSize.getRangeFieldMeta = () => {
      return {
        min: 0,
        max: 100,
        delta: 100,
      };
    };

    expect(iconSize.getMbSizeExpression()).toEqual([
      'interpolate',
      ['linear'],
      [
        'sqrt',
        [
          '+',
          [
            'coalesce',
            [
              'case',
              ['==', ['feature-state', 'foobar'], null],
              0,
              ['max', ['min', ['to-number', ['feature-state', 'foobar']], 100], 0],
            ],
            0,
          ],
          1,
        ],
      ],
      1,
      8,
      10.04987562112089,
      32,
    ]);
  });

  test('Should return interpolation expression without value shift when range.min is > 1', async () => {
    const field = {
      isValid: () => {
        return true;
      },
      getName: () => {
        return 'foodbar';
      },
      getMbFieldName: () => {
        return 'foobar';
      },
      getOrigin: () => {
        return FIELD_ORIGIN.SOURCE;
      },
      getSource: () => {
        return {
          isMvt: () => {
            return false;
          },
        };
      },
      supportsFieldMetaFromEs: () => {
        return true;
      },
    } as unknown as IField;
    const iconSize = new DynamicSizeProperty(
      { minSize: 8, maxSize: 32, fieldMetaOptions: { isEnabled: true } },
      VECTOR_STYLES.ICON_SIZE,
      field,
      {} as unknown as IVectorLayer,
      () => {
        return (value: RawValue) => value + '_format';
      },
      false
    );
    iconSize.getRangeFieldMeta = () => {
      return {
        min: 1,
        max: 100,
        delta: 100,
      };
    };

    expect(iconSize.getMbSizeExpression()).toEqual([
      'interpolate',
      ['linear'],
      [
        'sqrt',
        [
          'coalesce',
          [
            'case',
            ['==', ['feature-state', 'foobar'], null],
            1,
            ['max', ['min', ['to-number', ['feature-state', 'foobar']], 100], 1],
          ],
          1,
        ],
      ],
      1,
      8,
      10,
      32,
    ]);
  });
});

describe('getMbSizeExpression - icon', () => {
  test('Should return interpolation expression with square-root function', async () => {
    const field = {
      isValid: () => {
        return true;
      },
      getName: () => {
        return 'foodbar';
      },
      getMbFieldName: () => {
        return 'foobar';
      },
      getOrigin: () => {
        return FIELD_ORIGIN.SOURCE;
      },
      getSource: () => {
        return {
          isMvt: () => {
            return false;
          },
        };
      },
      supportsFieldMetaFromEs: () => {
        return true;
      },
    } as unknown as IField;
    const iconSize = new DynamicSizeProperty(
      { minSize: 8, maxSize: 32, fieldMetaOptions: { isEnabled: true } },
      VECTOR_STYLES.ICON_SIZE,
      field,
      {} as unknown as IVectorLayer,
      () => {
        return (value: RawValue) => value + '_format';
      },
      true
    );
    iconSize.getRangeFieldMeta = () => {
      return {
        min: 0,
        max: 100,
        delta: 100,
      };
    };

    expect(iconSize.getMbSizeExpression()).toEqual([
      'interpolate',
      ['linear'],
      [
        'sqrt',
        [
          '+',
          [
            'coalesce',
            [
              'case',
              ['==', ['get', 'foobar'], null],
              0,
              ['max', ['min', ['to-number', ['get', 'foobar']], 100], 0],
            ],
            0,
          ],
          1,
        ],
      ],
      1,
      1,
      10.04987562112089,
      4,
    ]);
  });
});
