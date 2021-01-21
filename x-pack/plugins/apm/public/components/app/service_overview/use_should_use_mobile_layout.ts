/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
