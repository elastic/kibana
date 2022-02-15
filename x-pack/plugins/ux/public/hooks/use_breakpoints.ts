/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import useWindowSize from 'react-use/lib/useWindowSize';
import useDebounce from 'react-use/lib/useDebounce';
import {
  getBreakpoint,
  isWithinMaxBreakpoint,
  isWithinMinBreakpoint,
} from '@elastic/eui';

export type Breakpoints = ReturnType<typeof getScreenSizes>;

export function getScreenSizes(windowWidth: number) {
  return {
    isXSmall: isWithinMaxBreakpoint(windowWidth, 'xs'),
    isSmall: isWithinMaxBreakpoint(windowWidth, 's'),
    isMedium: isWithinMaxBreakpoint(windowWidth, 'm'),
    isLarge: isWithinMaxBreakpoint(windowWidth, 'l'),
    isXl: isWithinMaxBreakpoint(windowWidth, 1599),
    isXXL: isWithinMaxBreakpoint(windowWidth, 1999),
    isXXXL: isWithinMinBreakpoint(windowWidth, 2000),
  };
}

export function useBreakpoints() {
  const { width } = useWindowSize();
  const [breakpoint, setBreakpoint] = useState(getBreakpoint(width));
  const [screenSizes, setScreenSizes] = useState(getScreenSizes(width));

  useDebounce(
    () => {
      setBreakpoint(getBreakpoint(width));
      setScreenSizes(getScreenSizes(width));
    },
    50,
    [width]
  );

  return { ...screenSizes, breakpoint, width };
}
