/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStyleProperty, percentilesValuesToFieldMeta } from './dynamic_style_property';
import type { IField } from '../../../fields/field';
import type { IVectorLayer } from '../../../layers/vector_layer';
import { type RawValue, VECTOR_STYLES } from '../../../../../common/constants';

describe('percentilesValuesToFieldMeta', () => {
  test('should return null when values is not defined', () => {
    expect(percentilesValuesToFieldMeta(undefined)).toBeNull();
    expect(percentilesValuesToFieldMeta({})).toBeNull();
  });

  test('should convert values to percentiles field meta', () => {
    expect(percentilesValuesToFieldMeta(undefined)).toBeNull();
    expect(
      percentilesValuesToFieldMeta({
        values: {
          '25.0': 375.0,
          '50.0': 400.0,
          '75.0': 550.0,
        },
      })
    ).toEqual([
      { percentile: '25.0', value: 375.0 },
      { percentile: '50.0', value: 400.0 },
      { percentile: '75.0', value: 550.0 },
    ]);
  });

  test('should remove duplicated percentile percentilesValuesToFieldMeta', () => {
    expect(percentilesValuesToFieldMeta(undefined)).toBeNull();
    expect(
      percentilesValuesToFieldMeta({
        values: {
          '25.0': 375.0,
          '50.0': 375.0,
          '75.0': 550.0,
        },
      })
    ).toEqual([
      { percentile: '25.0', value: 375.0 },
      { percentile: '75.0', value: 550.0 },
    ]);
  });
});

describe('getFieldMetaOptions', () => {
  const dynamicColorOptions = {
    color: 'Blues',
    colorCategory: 'palette_0',
    field: {
      name: 'machine.os.keyword',
      origin: 'source',
    },
    fieldMetaOptions: {
      isEnabled: false,
    },
    type: 'CATEGORICAL',
  };

  test('should not automatically enable fieldMeta when field does support field meta from local', () => {
    const property = new DynamicStyleProperty(
      dynamicColorOptions,
      VECTOR_STYLES.FILL_COLOR,
      {
        supportsFieldMetaFromLocalData: () => {
          return true;
        },
      } as unknown as IField,
      {} as unknown as IVectorLayer,
      () => {
        return (value: RawValue) => value + '_format';
      }
    );

    const fieldMetaOptions = property.getFieldMetaOptions();
    expect(fieldMetaOptions.isEnabled).toBe(false);
  });

  test('should automatically enable fieldMeta when field does not support field meta from local', () => {
    const property = new DynamicStyleProperty(
      dynamicColorOptions,
      VECTOR_STYLES.FILL_COLOR,
      {
        supportsFieldMetaFromLocalData: () => {
          return false;
        },
      } as unknown as IField,
      {} as unknown as IVectorLayer,
      () => {
        return (value: RawValue) => value + '_format';
      }
    );

    const fieldMetaOptions = property.getFieldMetaOptions();
    expect(fieldMetaOptions.isEnabled).toBe(true);

    // should not mutate original options state
    expect(dynamicColorOptions.fieldMetaOptions.isEnabled).toBe(false);
  });
});
