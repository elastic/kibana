/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  getColorRampCenterColor,
  getOrdinalMbColorRampStops,
  getColorPalette,
} from './color_palettes';

describe('getColorPalette', () => {
  it('Should create RGB color ramp', () => {
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
  it('Should get center color from color ramp', () => {
    expect(getColorRampCenterColor('Blues')).toBe('#9eb9d8');
  });
});

describe('getOrdinalMbColorRampStops', () => {
  it('Should create color stops for custom range', () => {
    expect(getOrdinalMbColorRampStops('Blues', 0, 1000)).toEqual([
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

  it('Should snap to end of color stops for identical range', () => {
    expect(getOrdinalMbColorRampStops('Blues', 23, 23)).toEqual([23, '#6092c0']);
  });
});
