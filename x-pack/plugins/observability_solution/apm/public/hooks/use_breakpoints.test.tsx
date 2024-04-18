/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { EuiProvider } from '@elastic/eui';
import { useBreakpoints } from './use_breakpoints';

const wrapper: FC = ({ children }) => (
  <EuiProvider
    modify={{
      // set in apm/public/application/index.tsx
      breakpoint: {
        xxl: 1600,
        xxxl: 2000,
      },
    }}
  >
    {children}
  </EuiProvider>
);

describe('useBreakpoints', () => {
  test('xs breakpoint', () => {
    window.innerWidth = 0;
    const { result } = renderHook(() => useBreakpoints(), { wrapper });
    expect(result.current).toEqual({
      isXSmall: true,
      isSmall: true,
      isMedium: true,
      isLarge: true,
      isXl: true,
      isXXL: true,
      isXXXL: false,
    });
  });

  test('s breakpoint', () => {
    window.innerWidth = 575;
    const { result } = renderHook(() => useBreakpoints(), { wrapper });
    expect(result.current).toEqual({
      isXSmall: false,
      isSmall: true,
      isMedium: true,
      isLarge: true,
      isXl: true,
      isXXL: true,
      isXXXL: false,
    });
  });

  test('m breakpoint', () => {
    window.innerWidth = 768;
    const { result } = renderHook(() => useBreakpoints(), { wrapper });
    expect(result.current).toEqual({
      isXSmall: false,
      isSmall: false,
      isMedium: true,
      isLarge: true,
      isXl: true,
      isXXL: true,
      isXXXL: false,
    });
  });

  test('l breakpoint', () => {
    window.innerWidth = 992;
    const { result } = renderHook(() => useBreakpoints(), { wrapper });
    expect(result.current).toEqual({
      isXSmall: false,
      isSmall: false,
      isMedium: false,
      isLarge: true,
      isXl: true,
      isXXL: true,
      isXXXL: false,
    });
  });

  test('xl breakpoint', () => {
    window.innerWidth = 1200;
    const { result } = renderHook(() => useBreakpoints(), { wrapper });
    expect(result.current).toEqual({
      isXSmall: false,
      isSmall: false,
      isMedium: false,
      isLarge: false,
      isXl: true,
      isXXL: true,
      isXXXL: false,
    });
  });

  test('xxl breakpoint', () => {
    window.innerWidth = 1600;
    const { result } = renderHook(() => useBreakpoints(), { wrapper });
    expect(result.current).toEqual({
      isXSmall: false,
      isSmall: false,
      isMedium: false,
      isLarge: false,
      isXl: false,
      isXXL: true,
      isXXXL: false,
    });
  });

  test('xxxl breakpoint', () => {
    window.innerWidth = 2000;
    const { result } = renderHook(() => useBreakpoints(), { wrapper });
    expect(result.current).toEqual({
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
