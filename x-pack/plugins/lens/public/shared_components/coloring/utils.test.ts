/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { applyPaletteParams, getContrastColor } from './utils';

describe('applyPaletteParams', () => {
  const paletteRegistry = chartPluginMock.createPaletteRegistry();
  it('should return a palette stops array only by the name', () => {
    expect(
      applyPaletteParams(
        paletteRegistry,
        { name: 'default', type: 'palette', params: { name: 'default' } },
        { min: 0, max: 100 }
      )
    ).toEqual([
      // stops are 0 and 50 by with a 20 offset (100 divided by 5 steps) for display
      // the mock palette service has only 2 colors so tests are a bit off by that
      { color: 'red', stop: 20 },
      { color: 'black', stop: 70 },
    ]);
  });

  it('should return a palette stops array reversed', () => {
    expect(
      applyPaletteParams(
        paletteRegistry,
        { name: 'default', type: 'palette', params: { name: 'default', reverse: true } },
        { min: 0, max: 100 }
      )
    ).toEqual([
      { color: 'black', stop: 20 },
      { color: 'red', stop: 70 },
    ]);
  });

  it('should pick the default palette from the activePalette object when passed', () => {
    expect(
      applyPaletteParams(paletteRegistry, { name: 'mocked', type: 'palette' }, { min: 0, max: 100 })
    ).toEqual([
      { color: 'blue', stop: 20 },
      { color: 'yellow', stop: 70 },
    ]);
  });
});

describe('getContrastColor', () => {
  it('should pick the light color when the passed one is dark', () => {
    expect(getContrastColor('#000', true)).toBe('#ffffff');
    expect(getContrastColor('#000', false)).toBe('#ffffff');
  });

  it('should pick the dark color when the passed one is light', () => {
    expect(getContrastColor('#fff', true)).toBe('#000000');
    expect(getContrastColor('#fff', false)).toBe('#000000');
  });

  it('should take into account background color if the primary color is opaque', () => {
    expect(getContrastColor('rgba(0,0,0,0)', true)).toBe('#ffffff');
    expect(getContrastColor('rgba(0,0,0,0)', false)).toBe('#000000');
    expect(getContrastColor('#00000000', true)).toBe('#ffffff');
    expect(getContrastColor('#00000000', false)).toBe('#000000');
    expect(getContrastColor('#ffffff00', true)).toBe('#ffffff');
    expect(getContrastColor('#ffffff00', false)).toBe('#000000');
    expect(getContrastColor('rgba(255,255,255,0)', true)).toBe('#ffffff');
    expect(getContrastColor('rgba(255,255,255,0)', false)).toBe('#000000');
  });
});
