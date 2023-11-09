/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef, useEffect } from 'react';

interface Dimension {
  width: number;
  height: number;
}

export const useDimension = <T extends HTMLElement>(
  ref: React.RefObject<T>
): [React.RefObject<T>, Dimension] => {
  const [dimensions, setDimensions] = useState<Dimension>({ width: 0, height: 0 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const currentElement = ref.current;
    if (!currentElement) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const [entry] = entries;
      const { width, height } = entry.contentRect;
      setDimensions({ width, height });
    });

    resizeObserver.observe(currentElement);

    resizeObserverRef.current = resizeObserver;

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.unobserve(currentElement);
        resizeObserverRef.current = null;
      }
    };
  }, [ref]);

  return [ref, dimensions];
};
