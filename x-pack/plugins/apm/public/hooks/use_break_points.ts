/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import useWindowSize from 'react-use/lib/useWindowSize';
import useDebounce from 'react-use/lib/useDebounce';
import { isWithinMaxBreakpoint } from '@elastic/eui';

function isMinXXL(windowWidth: number) {
  return windowWidth >= 1600;
}

function getScreenSizes(windowWidth: number) {
  const isXXL = isMinXXL(windowWidth);
  return {
    isSmall: isWithinMaxBreakpoint(windowWidth, 's'),
    isMedium: isWithinMaxBreakpoint(windowWidth, 'm'),
    isLarge: isWithinMaxBreakpoint(windowWidth, 'l'),
    isXl: isWithinMaxBreakpoint(windowWidth, 'xl') && !isXXL,
    isXXL,
  };
}

export function useBreakPoints() {
  const { width } = useWindowSize();
  const [screenSizes, setScreenSizes] = useState(getScreenSizes(width));

  useDebounce(
    () => {
      setScreenSizes(getScreenSizes(width));
    },
    50,
    [width]
  );

  return screenSizes;
}
