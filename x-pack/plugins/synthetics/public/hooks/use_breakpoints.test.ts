/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BREAKPOINTS } from '@elastic/eui';
import { renderHook } from '@testing-library/react-hooks';
import { useBreakpoints } from './use_breakpoints';

describe('use_breakpoints', () => {
  describe('useBreakpoints', () => {
    const width = global.innerWidth;

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    afterAll(() => {
      (global as { innerWidth: number }).innerWidth = width;
    });

    it('should only return up => false and down => true for "xs" when width is less than BREAKPOINTS.xs', () => {
      (global as { innerWidth: number }).innerWidth = BREAKPOINTS.xs - 1;
      const { result } = renderHook(() => useBreakpoints());

      expect(result.current.up('xs')).toBeFalsy();
      expect(result.current.down('xs')).toBeTruthy();
    });

    it('should only return up => true and down => false for "xs" when width is above or equal BREAKPOINTS.xs', () => {
      (global as { innerWidth: number }).innerWidth = BREAKPOINTS.xs;
      const { result } = renderHook(() => useBreakpoints());

      expect(result.current.up('xs')).toBeTruthy();
      expect(result.current.down('xs')).toBeFalsy();
    });

    it('should return down => true for "m" when width equals BREAKPOINTS.l', () => {
      (global as { innerWidth: number }).innerWidth = BREAKPOINTS.l;
      const { result } = renderHook(() => useBreakpoints());

      expect(result.current.up('m')).toBeTruthy();
      expect(result.current.down('m')).toBeFalsy();
    });

    it('should return `between` => true for "m" and  "xl" when width equals BREAKPOINTS.l', () => {
      (global as { innerWidth: number }).innerWidth = BREAKPOINTS.l;
      const { result } = renderHook(() => useBreakpoints());

      expect(result.current.between('m', 'xl')).toBeTruthy();
    });

    it('should return `between` => true for "s" and "m" when width equals BREAKPOINTS.s', () => {
      (global as { innerWidth: number }).innerWidth = BREAKPOINTS.s;
      const { result } = renderHook(() => useBreakpoints());

      expect(result.current.between('s', 'm')).toBeTruthy();
    });

    it('should return up => true for all when size is > xxxl+', () => {
      (global as { innerWidth: number }).innerWidth = 3000;
      const { result } = renderHook(() => useBreakpoints());

      expect(result.current.up('xs')).toBeTruthy();
      expect(result.current.up('s')).toBeTruthy();
      expect(result.current.up('m')).toBeTruthy();
      expect(result.current.up('l')).toBeTruthy();
      expect(result.current.up('xl')).toBeTruthy();
      expect(result.current.up('xxl')).toBeTruthy();
      expect(result.current.up('xxxl')).toBeTruthy();
    });

    it('should determine `isIpad (Portrait)', () => {
      (global as { innerWidth: number }).innerWidth = 768;
      const { result } = renderHook(() => useBreakpoints());

      const isIpad = result.current.up('m') && result.current.down('l');
      expect(isIpad).toEqual(true);
    });

    it('should determine `isMobile (Portrait)`', () => {
      (global as { innerWidth: number }).innerWidth = 480;
      const { result } = renderHook(() => useBreakpoints());

      const isMobile = result.current.up('xs') && result.current.down('s');
      expect(isMobile).toEqual(true);
    });
  });
});
