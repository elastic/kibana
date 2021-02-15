/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isWithinMaxBreakpoint } from '@elastic/eui';
import { useEffect, useState } from 'react';

export function useShouldUseMobileLayout() {
  const [shouldUseMobileLayout, setShouldUseMobileLayout] = useState(
    isWithinMaxBreakpoint(window.innerWidth, 'm')
  );

  useEffect(() => {
    const resizeHandler = () => {
      setShouldUseMobileLayout(isWithinMaxBreakpoint(window.innerWidth, 'm'));
    };
    window.addEventListener('resize', resizeHandler);

    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  });

  return shouldUseMobileLayout;
}
