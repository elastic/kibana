/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateColorRanges, isAllColorRangesValid } from './color_ranges_validation';

describe('Color ranges validation', () => {
  describe('validateColorRanges', () => {
    it('should return correct valid state for color ranges', () => {
      const colorRanges = [
        {
          start: 0,
          end: 10,
          color: '#aaa',
        },
        {
          start: 10,
          end: 20,
          color: '',
        },
        {
          start: 20,
          end: 15,
          color: '#aaa',
        },
      ];
      const validation = validateColorRanges(colorRanges, { min: 0, max: 100 }, 'number');
      expect(validation['0']).toEqual({
        errors: [],
        warnings: [],
        isValid: true,
      });
      expect(validation['1']).toEqual({
        errors: ['invalidColor'],
        warnings: [],
        isValid: false,
      });
      expect(validation.last).toEqual({
        errors: ['greaterThanMaxValue'],
        warnings: [],
        isValid: false,
      });
    });

    it('should return correct warnings for color ranges', () => {
      const colorRanges = [
        {
          start: 0,
          end: 10,
          color: '#aaa',
        },
        {
          start: 10,
          end: 20,
          color: '#bbb',
        },
        {
          start: 20,
          end: 35,
          color: '#ccc',
        },
      ];
      const validation = validateColorRanges(colorRanges, { min: 5, max: 30 }, 'number');
      expect(validation['0']).toEqual({
        errors: [],
        warnings: ['lowerThanDataBounds'],
        isValid: true,
      });
      expect(validation['1']).toEqual({
        errors: [],
        warnings: [],
        isValid: true,
      });
      expect(validation.last).toEqual({
        errors: [],
        warnings: ['greaterThanDataBounds'],
        isValid: true,
      });
    });

    it('should not return warnings for color ranges in number mode if we get fallback as data bounds', () => {
      const colorRanges = [
        {
          start: 0,
          end: 10,
          color: '#aaa',
        },
        {
          start: 10,
          end: 20,
          color: '#bbb',
        },
        {
          start: 20,
          end: 35,
          color: '#ccc',
        },
      ];
      const validation = validateColorRanges(
        colorRanges,
        { min: 5, max: 30, fallback: true },
        'number'
      );
      expect(validation['0']).toEqual({
        errors: [],
        warnings: [],
        isValid: true,
      });
      expect(validation['1']).toEqual({
        errors: [],
        warnings: [],
        isValid: true,
      });
      expect(validation.last).toEqual({
        errors: [],
        warnings: [],
        isValid: true,
      });
    });
  });

  describe('isAllColorRangesValid', () => {
    it('should return true if all color ranges is valid', () => {
      const colorRanges = [
        {
          start: 0,
          end: 10,
          color: '#aaa',
        },
        {
          start: 10,
          end: 20,
          color: '#bbb',
        },
        {
          start: 20,
          end: 15,
          color: '#ccc',
        },
      ];
      let isValid = isAllColorRangesValid(colorRanges, { min: 5, max: 40 }, 'number');
      expect(isValid).toBeFalsy();
      colorRanges[colorRanges.length - 1].end = 30;
      isValid = isAllColorRangesValid(colorRanges, { min: 5, max: 40 }, 'number');
      expect(isValid).toBeTruthy();
    });
  });
});
