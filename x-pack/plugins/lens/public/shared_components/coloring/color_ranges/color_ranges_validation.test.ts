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
      const validation = validateColorRanges(colorRanges);
      expect(validation['0']).toEqual({
        errors: [],
        isValid: true,
      });
      expect(validation['1']).toEqual({
        errors: ['invalidColor'],
        isValid: false,
      });
      expect(validation.last).toEqual({
        errors: ['greaterThanMaxValue'],
        isValid: false,
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
      let isValid = isAllColorRangesValid(colorRanges);
      expect(isValid).toBeFalsy();
      colorRanges[colorRanges.length - 1].end = 30;
      isValid = isAllColorRangesValid(colorRanges);
      expect(isValid).toBeTruthy();
    });
  });
});
