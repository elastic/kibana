/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { percentilesValuesToFieldMeta } from './dynamic_style_property';

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
