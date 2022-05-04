/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import useWindowSize from 'react-use/lib/useWindowSize';
import useDebounce from 'react-use/lib/useDebounce';

import { BREAKPOINTS, EuiBreakpointSize } from '@elastic/eui';

// Custom breakpoints
const BREAKPOINT_XL = 1599; // Overriding the theme's default 'xl' breakpoint
const BREAKPOINT_XXL = 1599;
const BREAKPOINT_XXXL = 2000;

export type BreakpointKey = EuiBreakpointSize | 'xxl' | 'xxxl';

type BreakpointPredicate = (breakpointKey: BreakpointKey) => boolean;
type BreakpointRangePredicate = (from: BreakpointKey, to: BreakpointKey) => boolean;

/**
 * Returns the predicates functions used to determine whether the current device's width is above or below the asked
 * breakpoint. (Implementation inspired by React Material UI).
 *
 * @example
 * const { breakpoints } = useBreakpoints();
 * const isMobile = breakpoint.down('m');
 *
 * @example
 * const { breakpoints } = useBreakpoints();
 * const isTablet = breakpoint.between('m', 'l');
 *
 * @param debounce {number} Debounce interval for optimization
 *
 * @returns { {up: BreakpointPredicate, down: BreakpointPredicate, between: BreakpointRangePredicate} }
 * Returns object containing predicates which determine whether the current device's width lies above, below or
 * in-between the given breakpoint(s)
 * {
 *  up => Returns `true` if the current width is equal or above (inclusive) the given breakpoint size,
 *        or `false` otherwise.
 *  down => Returns `true` if the current width is below (exclusive) the given breakpoint size, or `false` otherwise.
 *  between =>  Returns `true` if the current width is equal or above (inclusive) the corresponding size of
 *              `fromBreakpointKey` AND is below (exclusive) the corresponding width of `toBreakpointKey`.
 *              Returns `false` otherwise.
 * }
 */
export function useBreakpoints(debounce = 50) {
  const { width } = useWindowSize();
  const [debouncedWidth, setDebouncedWidth] = useState(width);

  const up = useCallback<BreakpointPredicate>(
    (breakpointKey: BreakpointKey) => isUp(debouncedWidth, breakpointKey),
    [debouncedWidth]
  );
  const down = useCallback<BreakpointPredicate>(
    (breakpointKey: BreakpointKey) => isDown(debouncedWidth, breakpointKey),
    [debouncedWidth]
  );

  const between = useCallback<BreakpointRangePredicate>(
    (fromBreakpointKey: BreakpointKey, toBreakpointKey: BreakpointKey) =>
      isBetween(debouncedWidth, fromBreakpointKey, toBreakpointKey),
    [debouncedWidth]
  );

  useDebounce(
    () => {
      setDebouncedWidth(width);
    },
    debounce,
    [width]
  );

  return { up, down, between, debouncedWidth };
}

/**
 * Returns the corresponding device width against the provided breakpoint key, either the overridden value or the
 * default value from theme.
 * @param key {BreakpointKey} string key representing the device breakpoint e.g. 'xs', 's', 'xxxl'
 */
function getSizeForBreakpointKey(key: BreakpointKey): number {
  switch (key) {
    case 'xxxl':
      return BREAKPOINT_XXXL;
    case 'xxl':
      return BREAKPOINT_XXL;
    case 'xl':
      return BREAKPOINT_XL;
    case 'l':
      return BREAKPOINTS.l;
    case 'm':
      return BREAKPOINTS.m;
    case 's':
      return BREAKPOINTS.s;
  }

  return BREAKPOINTS.xs;
}

function isUp(size: number, breakpointKey: BreakpointKey) {
  return size >= getSizeForBreakpointKey(breakpointKey);
}

function isDown(size: number, breakpointKey: BreakpointKey) {
  return size < getSizeForBreakpointKey(breakpointKey);
}

function isBetween(size: number, fromBreakpointKey: BreakpointKey, toBreakpointKey: BreakpointKey) {
  return isUp(size, fromBreakpointKey) && isDown(size, toBreakpointKey);
}
