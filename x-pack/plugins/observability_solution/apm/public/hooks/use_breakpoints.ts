/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useIsWithinMaxBreakpoint,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import { useMemo } from 'react';

export type Breakpoints = Record<string, boolean>;

export function useBreakpoints() {
  const isXSmall = useIsWithinMaxBreakpoint('xs');
  const isSmall = useIsWithinMaxBreakpoint('s');
  const isMedium = useIsWithinMaxBreakpoint('m');
  const isLarge = useIsWithinMaxBreakpoint('l');
  const isXl = useIsWithinMaxBreakpoint('xl');
  const isXXL = useIsWithinMaxBreakpoint('xxl');
  const isXXXL = useIsWithinMinBreakpoint('xxxl');

  return useMemo(() => {
    return { isXSmall, isSmall, isMedium, isLarge, isXl, isXXL, isXXXL };
  }, [isXSmall, isSmall, isMedium, isLarge, isXl, isXXL, isXXXL]);
}
