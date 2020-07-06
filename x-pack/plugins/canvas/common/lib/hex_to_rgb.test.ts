/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { hexToRgb } from './hex_to_rgb';

describe('hexToRgb', () => {
  it('returns null for an invalid hex', () => {
    expect(hexToRgb('hexadecimal')).toBeNull();
    expect(hexToRgb('#00')).toBeNull();
    expect(hexToRgb('#00000')).toBeNull();
  });
  it('returns correct value for shorthand hex codes', () => {
    expect(hexToRgb('#000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#FFF')).toEqual([255, 255, 255]);
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#fFf')).toEqual([255, 255, 255]);
  });
  it('returns correct value for longhand hex codes', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#fffFFF')).toEqual([255, 255, 255]);
    expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
  });
});
