/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import {
  applyPaletteParams,
  getContrastColor,
  getDataMinMax,
  getPaletteStops,
  getStepValue,
  isValidColor,
  mergePaletteParams,
  remapStopsByNewInterval,
  reversePalette,
  roundStopValues,
} from './utils';

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
});

describe('remapStopsByNewInterval', () => {
  it('should correctly remap the current palette from 0..1 to 0...100', () => {
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: 0 },
          { color: 'green', stop: 0.5 },
          { color: 'red', stop: 0.9 },
        ],
        { newInterval: 100, oldInterval: 1, newMin: 0, oldMin: 0 }
      )
    ).toEqual([
      { color: 'black', stop: 0 },
      { color: 'green', stop: 50 },
      { color: 'red', stop: 90 },
    ]);

    // now test the other way around
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: 0 },
          { color: 'green', stop: 50 },
          { color: 'red', stop: 90 },
        ],
        { newInterval: 1, oldInterval: 100, newMin: 0, oldMin: 0 }
      )
    ).toEqual([
      { color: 'black', stop: 0 },
      { color: 'green', stop: 0.5 },
      { color: 'red', stop: 0.9 },
    ]);
  });

  it('should correctly handle negative numbers to/from', () => {
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: -100 },
          { color: 'green', stop: -50 },
          { color: 'red', stop: -1 },
        ],
        { newInterval: 100, oldInterval: 100, newMin: 0, oldMin: -100 }
      )
    ).toEqual([
      { color: 'black', stop: 0 },
      { color: 'green', stop: 50 },
      { color: 'red', stop: 99 },
    ]);

    // now map the other way around
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: 0 },
          { color: 'green', stop: 50 },
          { color: 'red', stop: 99 },
        ],
        { newInterval: 100, oldInterval: 100, newMin: -100, oldMin: 0 }
      )
    ).toEqual([
      { color: 'black', stop: -100 },
      { color: 'green', stop: -50 },
      { color: 'red', stop: -1 },
    ]);

    // and test also palettes that also contains negative values
    expect(
      remapStopsByNewInterval(
        [
          { color: 'black', stop: -50 },
          { color: 'green', stop: 0 },
          { color: 'red', stop: 50 },
        ],
        { newInterval: 100, oldInterval: 100, newMin: 0, oldMin: -50 }
      )
    ).toEqual([
      { color: 'black', stop: 0 },
      { color: 'green', stop: 50 },
      { color: 'red', stop: 100 },
    ]);
  });
});

describe('getDataMinMax', () => {
  it('should pick the correct min/max based on the current range type', () => {
    expect(getDataMinMax('percent', { min: -100, max: 0 })).toEqual({ min: 0, max: 100 });
  });

  it('should pick the correct min/max apply percent by default', () => {
    expect(getDataMinMax(undefined, { min: -100, max: 0 })).toEqual({ min: 0, max: 100 });
  });
});

describe('getPaletteStops', () => {
  const paletteRegistry = chartPluginMock.createPaletteRegistry();
  it('should correctly compute a predefined palette stops definition from only the name', () => {
    expect(
      getPaletteStops(paletteRegistry, { name: 'mock' }, { dataBounds: { min: 0, max: 100 } })
    ).toEqual([
      { color: 'blue', stop: 20 },
      { color: 'yellow', stop: 70 },
    ]);
  });

  it('should correctly compute a predefined palette stops definition from explicit prevPalette (override)', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        { name: 'default' },
        { dataBounds: { min: 0, max: 100 }, prevPalette: 'mock' }
      )
    ).toEqual([
      { color: 'blue', stop: 20 },
      { color: 'yellow', stop: 70 },
    ]);
  });

  it('should infer the domain from dataBounds but start from 0', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        { name: 'default', rangeType: 'number' },
        { dataBounds: { min: 1, max: 11 }, prevPalette: 'mock' }
      )
    ).toEqual([
      { color: 'blue', stop: 2 },
      { color: 'yellow', stop: 7 },
    ]);
  });

  it('should override the minStop when requested', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        { name: 'default', rangeType: 'number' },
        { dataBounds: { min: 1, max: 11 }, mapFromMinValue: true }
      )
    ).toEqual([
      { color: 'red', stop: 1 },
      { color: 'black', stop: 6 },
    ]);
  });

  it('should compute a display stop palette from custom colorStops defined by the user', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        {
          name: 'custom',
          rangeType: 'number',
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 40 },
            { color: 'red', stop: 80 },
          ],
        },
        { dataBounds: { min: 0, max: 100 } }
      )
    ).toEqual([
      { color: 'green', stop: 40 },
      { color: 'blue', stop: 80 },
      { color: 'red', stop: 100 },
    ]);
  });

  it('should compute a display stop palette from custom colorStops defined by the user - handle stop at the end', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        {
          name: 'custom',
          rangeType: 'number',
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 40 },
            { color: 'red', stop: 100 },
          ],
        },
        { dataBounds: { min: 0, max: 100 } }
      )
    ).toEqual([
      { color: 'green', stop: 40 },
      { color: 'blue', stop: 100 },
      { color: 'red', stop: 101 },
    ]);
  });

  it('should compute a display stop palette from custom colorStops defined by the user - handle stop at the end (fractional)', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        {
          name: 'custom',
          rangeType: 'number',
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 0.4 },
            { color: 'red', stop: 1 },
          ],
        },
        { dataBounds: { min: 0, max: 1 } }
      )
    ).toEqual([
      { color: 'green', stop: 0.4 },
      { color: 'blue', stop: 1 },
      { color: 'red', stop: 2 },
    ]);
  });

  it('should compute a display stop palette from custom colorStops defined by the user - stretch the stops to 100% percent', () => {
    expect(
      getPaletteStops(
        paletteRegistry,
        {
          name: 'custom',
          colorStops: [
            { color: 'green', stop: 0 },
            { color: 'blue', stop: 0.4 },
            { color: 'red', stop: 1 },
          ],
        },
        { dataBounds: { min: 0, max: 1 } }
      )
    ).toEqual([
      { color: 'green', stop: 0.4 },
      { color: 'blue', stop: 1 },
      { color: 'red', stop: 100 }, // default rangeType is percent, hence stretch to 100%
    ]);
  });
});

describe('reversePalette', () => {
  it('should correctly reverse color and stops', () => {
    expect(
      reversePalette([
        { color: 'red', stop: 0 },
        { color: 'green', stop: 0.5 },
        { color: 'blue', stop: 0.9 },
      ])
    ).toEqual([
      { color: 'blue', stop: 0 },
      { color: 'green', stop: 0.5 },
      { color: 'red', stop: 0.9 },
    ]);
  });
});

describe('mergePaletteParams', () => {
  it('should return a full palette', () => {
    expect(mergePaletteParams({ type: 'palette', name: 'myPalette' }, { reverse: true })).toEqual({
      type: 'palette',
      name: 'myPalette',
      params: { reverse: true },
    });
  });
});

describe('isValidColor', () => {
  it('should return ok for valid hex color notation', () => {
    expect(isValidColor('#fff')).toBe(true);
    expect(isValidColor('#ffffff')).toBe(true);
    expect(isValidColor('#ffffffaa')).toBe(true);
  });

  it('should return false for non valid strings', () => {
    expect(isValidColor('')).toBe(false);
    expect(isValidColor('#')).toBe(false);
    expect(isValidColor('#ff')).toBe(false);
    expect(isValidColor('123')).toBe(false);
    expect(isValidColor('rgb(1, 1, 1)')).toBe(false);
    expect(isValidColor('rgba(1, 1, 1, 0)')).toBe(false);
    expect(isValidColor('#ffffffgg')).toBe(false);
    expect(isValidColor('#fff00')).toBe(false);
    // this version of chroma does not support hex4 format
    expect(isValidColor('#fffa')).toBe(false);
  });
});

describe('roundStopValues', () => {
  it('should round very long values', () => {
    expect(roundStopValues([{ color: 'red', stop: 0.1515 }])).toEqual([
      { color: 'red', stop: 0.15 },
    ]);
  });
});

describe('getStepValue', () => {
  it('should compute the next step based on the last 2 stops', () => {
    expect(
      getStepValue(
        // first arg is taken as max reference
        [
          { color: 'red', stop: 0 },
          { color: 'red', stop: 50 },
        ],
        [
          { color: 'red', stop: 0 },
          { color: 'red', stop: 50 },
        ],
        100
      )
    ).toBe(50);

    expect(
      getStepValue(
        // first arg is taken as max reference
        [
          { color: 'red', stop: 0 },
          { color: 'red', stop: 80 },
        ],
        [
          { color: 'red', stop: 0 },
          { color: 'red', stop: 50 },
        ],
        90
      )
    ).toBe(10); // 90 - 80

    expect(
      getStepValue(
        // first arg is taken as max reference
        [
          { color: 'red', stop: 0 },
          { color: 'red', stop: 100 },
        ],
        [
          { color: 'red', stop: 0 },
          { color: 'red', stop: 50 },
        ],
        100
      )
    ).toBe(1);
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
});
