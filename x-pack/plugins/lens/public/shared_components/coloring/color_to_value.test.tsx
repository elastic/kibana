/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getContrastColor, workoutColorForValue } from './color_to_value';

describe('getContrastColor', () => {
  it('should pick the light color when the passed one is dark', () => {
    expect(getContrastColor('#000', true)).toBe('#dfe5ef');
    expect(getContrastColor('#000', false)).toBe('#ffffff');
  });

  it('should pick the dark color when the passed one is light', () => {
    expect(getContrastColor('#fff', true)).toBe('#1d1e24');
    expect(getContrastColor('#fff', false)).toBe('#343741');
  });
});

describe('workoutColorForValue', () => {
  it('should return no color for empty value', () => {
    expect(
      workoutColorForValue(
        undefined,
        {
          continuity: 'above',
          colors: ['red', 'green', 'blue', 'yellow'],
          range: 'number',
          gradient: false,
          rangeMin: 0,
          rangeMax: 200,
          stops: [],
        },
        { min: 0, max: 200 }
      )
    ).toBeUndefined();
  });

  describe('range: "number"', () => {
    it('find the right color for predefined palettes', () => {
      expect(
        workoutColorForValue(
          123,
          {
            continuity: 'above',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'number',
            gradient: false,
            rangeMin: 0,
            rangeMax: 200,
            stops: [],
          },
          { min: 0, max: 200 }
        )
      ).toBe('blue');
    });

    it('find the right color for custom stops palettes', () => {
      expect(
        workoutColorForValue(
          50,
          {
            continuity: 'above',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'number',
            gradient: false,
            rangeMin: 0,
            rangeMax: 200,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('blue');
    });

    it('find the right color for custom stops palettes when value is higher than rangeMax', () => {
      expect(
        workoutColorForValue(
          123,
          {
            continuity: 'above',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'number',
            gradient: false,
            rangeMin: 0,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('yellow');
      expect(
        workoutColorForValue(
          123,
          {
            continuity: 'all',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'number',
            gradient: false,
            rangeMin: 0,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('yellow');
    });

    it('returns no color if the value if higher than rangeMax and continuity is nor "above" or "all"', () => {
      expect(
        workoutColorForValue(
          123,
          {
            continuity: 'below',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'number',
            gradient: false,
            rangeMin: 0,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
      expect(
        workoutColorForValue(
          123,
          {
            continuity: 'none',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'number',
            gradient: false,
            rangeMin: 0,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
    });

    it('find the right color for custom stops palettes when value is lower than rangeMin', () => {
      expect(
        workoutColorForValue(
          10,
          {
            continuity: 'below',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'number',
            gradient: false,
            rangeMin: 20,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('red');
      expect(
        workoutColorForValue(
          10,
          {
            continuity: 'all',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'number',
            gradient: false,
            rangeMin: 20,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('red');
    });

    it('returns no color if the value if lower than rangeMin and continuity is nor "below" or "all"', () => {
      expect(
        workoutColorForValue(
          0,
          {
            continuity: 'above',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'number',
            gradient: false,
            rangeMin: 10,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
      expect(
        workoutColorForValue(
          0,
          {
            continuity: 'none',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'number',
            gradient: false,
            rangeMin: 10,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
    });
  });

  describe('range: "percent"', () => {
    it('find the right color for predefined palettes', () => {
      expect(
        workoutColorForValue(
          123,
          {
            continuity: 'above',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'percent',
            gradient: false,
            rangeMin: 0,
            rangeMax: 100,
            stops: [],
          },
          { min: 0, max: 200 }
        )
      ).toBe('blue');
    });

    it('find the right color for custom stops palettes', () => {
      expect(
        workoutColorForValue(
          113,
          {
            continuity: 'above',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'percent',
            gradient: false,
            rangeMin: 0,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('blue'); // 113/200 ~ 56%
    });

    it('find the right color for custom stops palettes when value is higher than rangeMax', () => {
      expect(
        workoutColorForValue(
          123,
          {
            continuity: 'above',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'percent',
            gradient: false,
            rangeMin: 0,
            rangeMax: 90,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('yellow');
      expect(
        workoutColorForValue(
          123,
          {
            continuity: 'all',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'percent',
            gradient: false,
            rangeMin: 0,
            rangeMax: 90,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('yellow');
    });

    it('returns no color if the value if higher than rangeMax and continuity is nor "above" or "all"', () => {
      expect(
        workoutColorForValue(
          190,
          {
            continuity: 'below',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'percent',
            gradient: false,
            rangeMin: 0,
            rangeMax: 90,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
      expect(
        workoutColorForValue(
          190,
          {
            continuity: 'none',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'percent',
            gradient: false,
            rangeMin: 0,
            rangeMax: 90,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
    });

    it('find the right color for custom stops palettes when value is lower than rangeMin', () => {
      expect(
        workoutColorForValue(
          10,
          {
            continuity: 'below',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'percent',
            gradient: false,
            rangeMin: 20,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('red');
      expect(
        workoutColorForValue(
          10,
          {
            continuity: 'all',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'percent',
            gradient: false,
            rangeMin: 20,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBe('red');
    });

    it('returns no color if the value if lower than rangeMin and continuity is nor "below" or "all"', () => {
      expect(
        workoutColorForValue(
          0,
          {
            continuity: 'above',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'percent',
            gradient: false,
            rangeMin: 10,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
      expect(
        workoutColorForValue(
          0,
          {
            continuity: 'none',
            colors: ['red', 'green', 'blue', 'yellow'],
            range: 'percent',
            gradient: false,
            rangeMin: 10,
            rangeMax: 100,
            stops: [20, 40, 60, 80],
          },
          { min: 0, max: 200 }
        )
      ).toBeUndefined();
    });
  });
});
