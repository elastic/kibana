/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';

/** Returns a `ref` to attach to a DOM element, and its dimensions. */
export function useDimensions<T extends Element>() {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | undefined>();
  const elementRef = useRef<T>();

  const resizeObserverInstance = useRef<ResizeObserver>(
    new ResizeObserver((entries) => {
      if (entries && entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    })
  );

  useEffect(() => {
    // This makes ESLint happy. The cleanup function cannot point to the
    // `.current` property of a ref.
    const ref = elementRef.current;
    const resizeObserver = resizeObserverInstance.current;

    if (ref) {
      resizeObserver.observe(ref);
    }

    return () => {
      if (ref) {
        resizeObserver.unobserve(ref);
      }
    };

    // ESlint complains about this dependencies not triggering `useEffect`
    // because they are mutable. This is not a problem for our case. We don't
    // care if the attached DOM node mutates. We only want to know when the node
    // gets attached to the ref.
    //
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementRef.current, resizeObserverInstance.current]);

  return { elementRef, ...dimensions };
}
