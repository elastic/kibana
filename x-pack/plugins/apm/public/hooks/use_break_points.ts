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

export function useBreakPoints() {
  const [screenSizes, setScreenSizes] = useState({
    isSmall: false,
    isMedium: false,
    isLarge: false,
    isXl: false,
  });

  const { width } = useWindowSize();

  useDebounce(
    () => {
      const windowWidth = window.innerWidth;

      setScreenSizes({
        isSmall: isWithinMaxBreakpoint(windowWidth, 's'),
        isMedium: isWithinMaxBreakpoint(windowWidth, 'm'),
        isLarge: isWithinMaxBreakpoint(windowWidth, 'l'),
        isXl: isWithinMaxBreakpoint(windowWidth, 'xl'),
      });
    },
    50,
    [width]
  );

  return screenSizes;
}
