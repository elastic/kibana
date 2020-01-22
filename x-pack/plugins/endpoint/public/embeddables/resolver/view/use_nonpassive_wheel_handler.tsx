/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
/**
 * Register an event handler directly on `elementRef` for the `wheel` event, with no options
 * React sets native event listeners on the `window` and calls provided handlers via event propagation.
 * As of Chrome 73, `'wheel'` events on `window` are automatically treated as 'passive'.
 * If you don't need to call `event.preventDefault` then you should use regular React event handling instead.
 */
export function useNonPassiveWheelHandler(
  handler: (event: WheelEvent) => void,
  elementRef: HTMLElement | null
) {
  useEffect(() => {
    if (elementRef !== null) {
      elementRef.addEventListener('wheel', handler);
      return () => {
        elementRef.removeEventListener('wheel', handler);
      };
    }
  }, [elementRef, handler]);
}
