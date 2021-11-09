/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getScreenSizes } from './use_breakpoints';

describe('use_breakpoints', () => {
  describe('getScreenSizes', () => {
    it('return xs when within 0px - 5740x', () => {
      expect(getScreenSizes(0)).toEqual({
        isXSmall: true,
        isSmall: true,
        isMedium: true,
        isLarge: true,
        isXl: true,
        isXXL: true,
        isXXXL: false,
      });
      expect(getScreenSizes(574)).toEqual({
        isXSmall: true,
        isSmall: true,
        isMedium: true,
        isLarge: true,
        isXl: true,
        isXXL: true,
        isXXXL: false,
      });
    });
    it('return s when within 575px - 767px', () => {
      expect(getScreenSizes(575)).toEqual({
        isXSmall: false,
        isSmall: true,
        isMedium: true,
        isLarge: true,
        isXl: true,
        isXXL: true,
        isXXXL: false,
      });
      expect(getScreenSizes(767)).toEqual({
        isXSmall: false,
        isSmall: true,
        isMedium: true,
        isLarge: true,
        isXl: true,
        isXXL: true,
        isXXXL: false,
      });
    });
    it('return m when within 768px - 991', () => {
      expect(getScreenSizes(768)).toEqual({
        isXSmall: false,
        isSmall: false,
        isMedium: true,
        isLarge: true,
        isXl: true,
        isXXL: true,
        isXXXL: false,
      });
      expect(getScreenSizes(991)).toEqual({
        isXSmall: false,
        isSmall: false,
        isMedium: true,
        isLarge: true,
        isXl: true,
        isXXL: true,
        isXXXL: false,
      });
    });
    it('return l when within 992px - 1199px', () => {
      expect(getScreenSizes(992)).toEqual({
        isXSmall: false,
        isSmall: false,
        isMedium: false,
        isLarge: true,
        isXl: true,
        isXXL: true,
        isXXXL: false,
      });
      expect(getScreenSizes(1199)).toEqual({
        isXSmall: false,
        isSmall: false,
        isMedium: false,
        isLarge: true,
        isXl: true,
        isXXL: true,
        isXXXL: false,
      });
    });
    it('return xl when within 1200px - 1599px', () => {
      expect(getScreenSizes(1200)).toEqual({
        isXSmall: false,
        isSmall: false,
        isMedium: false,
        isLarge: false,
        isXl: true,
        isXXL: true,
        isXXXL: false,
      });
      expect(getScreenSizes(1599)).toEqual({
        isXSmall: false,
        isSmall: false,
        isMedium: false,
        isLarge: false,
        isXl: true,
        isXXL: true,
        isXXXL: false,
      });
    });
    it('return xxl when within 1600px - 1999px', () => {
      expect(getScreenSizes(1600)).toEqual({
        isXSmall: false,
        isSmall: false,
        isMedium: false,
        isLarge: false,
        isXl: false,
        isXXL: true,
        isXXXL: false,
      });
      expect(getScreenSizes(1999)).toEqual({
        isXSmall: false,
        isSmall: false,
        isMedium: false,
        isLarge: false,
        isXl: false,
        isXXL: true,
        isXXXL: false,
      });
    });
    it('return xxxl when greater than or equals to 2000px', () => {
      expect(getScreenSizes(2000)).toEqual({
        isXSmall: false,
        isSmall: false,
        isMedium: false,
        isLarge: false,
        isXl: false,
        isXXL: false,
        isXXXL: true,
      });
      expect(getScreenSizes(3000)).toEqual({
        isXSmall: false,
        isSmall: false,
        isMedium: false,
        isLarge: false,
        isXl: false,
        isXXL: false,
        isXXXL: true,
      });
    });
  });
});
