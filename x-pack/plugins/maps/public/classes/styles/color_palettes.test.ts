/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getColorRampCenterColor,
  getOrdinalMbColorRampStops,
  getPercentilesMbColorRampStops,
  getColorPalette,
} from './color_palettes';

describe('getColorPalette', () => {
  test('Should create RGB color ramp', () => {
    expect(getColorPalette('Blues')).toEqual([
      '#ecf1f7',
      '#d9e3ef',
      '#c5d5e7',
      '#b2c7df',
      '#9eb9d8',
      '#8bacd0',
      '#769fc8',
      '#6092c0',
    ]);
  });
});

describe('getColorRampCenterColor', () => {
  test('Should get center color from color ramp', () => {
    expect(getColorRampCenterColor('Blues')).toBe('#9eb9d8');
  });
});

describe('getOrdinalMbColorRampStops', () => {
  test('Should create color stops', () => {
    expect(getOrdinalMbColorRampStops('Blues', 0, 1000, false)).toEqual([
      0,
      '#ecf1f7',
      125,
      '#d9e3ef',
      250,
      '#c5d5e7',
      375,
      '#b2c7df',
      500,
      '#9eb9d8',
      625,
      '#8bacd0',
      750,
      '#769fc8',
      875,
      '#6092c0',
    ]);
  });

  test('Should create inverted color stops', () => {
    expect(getOrdinalMbColorRampStops('Blues', 0, 1000, true)).toEqual([
      0,
      '#6092c0',
      125,
      '#769fc8',
      250,
      '#8bacd0',
      375,
      '#9eb9d8',
      500,
      '#b2c7df',
      625,
      '#c5d5e7',
      750,
      '#d9e3ef',
      875,
      '#ecf1f7',
    ]);
  });

  test('Should snap to end of color stops for identical range', () => {
    expect(getOrdinalMbColorRampStops('Blues', 23, 23, false)).toEqual([23, '#6092c0']);
  });
});

describe('getPercentilesMbColorRampStops', () => {
  test('Should create color stops', () => {
    const percentiles = [
      { percentile: '50.0', value: 5567.83 },
      { percentile: '75.0', value: 8069 },
      { percentile: '90.0', value: 9581.13 },
      { percentile: '95.0', value: 11145.5 },
      { percentile: '99.0', value: 16958.18 },
    ];
    expect(getPercentilesMbColorRampStops('Blues', percentiles, false)).toEqual([
      5567.83,
      '#e0e8f2',
      8069,
      '#c2d2e6',
      9581.13,
      '#a2bcd9',
      11145.5,
      '#82a7cd',
      16958.18,
      '#6092c0',
    ]);
  });

  test('Should create inverted color stops', () => {
    const percentiles = [
      { percentile: '50.0', value: 5567.83 },
      { percentile: '75.0', value: 8069 },
      { percentile: '90.0', value: 9581.13 },
      { percentile: '95.0', value: 11145.5 },
      { percentile: '99.0', value: 16958.18 },
    ];
    expect(getPercentilesMbColorRampStops('Blues', percentiles, true)).toEqual([
      5567.83,
      '#6092c0',
      8069,
      '#82a7cd',
      9581.13,
      '#a2bcd9',
      11145.5,
      '#c2d2e6',
      16958.18,
      '#e0e8f2',
    ]);
  });
});
