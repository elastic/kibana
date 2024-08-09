/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiThemeBreakpoints } from '@elastic/eui';
import {
  useCurrentEuiBreakpoint,
  useIsWithinMaxBreakpoint,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import { useMemo } from 'react';
import { Values } from '@kbn/utility-types';

export type Breakpoints = Record<string, boolean>;

export const EUI_BREAKPOINTS = {
  xs: EuiThemeBreakpoints[0],
  s: EuiThemeBreakpoints[1],
  m: EuiThemeBreakpoints[2],
  l: EuiThemeBreakpoints[3],
  xl: EuiThemeBreakpoints[4],
};

export type EuiBreakpoint = Values<typeof EUI_BREAKPOINTS>;

export function useBreakpoints() {
  const isXSmall = useIsWithinMaxBreakpoint('xs');
  const isSmall = useIsWithinMaxBreakpoint('s');
  const isMedium = useIsWithinMaxBreakpoint('m');
  const isLarge = useIsWithinMaxBreakpoint('l');
  const isXl = useIsWithinMinBreakpoint('xl');

  const currentBreakpoint = useCurrentEuiBreakpoint();

  return useMemo(() => {
    return {
      isXSmall,
      isSmall,
      isMedium,
      isLarge,
      isXl,
      currentBreakpoint: (currentBreakpoint ?? EUI_BREAKPOINTS.xl) as EuiBreakpoint,
    };
  }, [isXSmall, isSmall, isMedium, isLarge, isXl, currentBreakpoint]);
}
