/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, type RefObject } from 'react';

/**
 * Custom hook that measures the height of an element using ResizeObserver
 * @param ref - React ref to the element to measure
 * @param enabled - Whether the observer should be enabled (default: true)
 * @returns The height of the element in pixels
 */
export function useElementHeight<T extends HTMLElement>(
  ref: RefObject<T>,
  enabled: boolean = true
): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!enabled || !ref.current) {
      return;
    }

    const element = ref.current;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(entry.target.getBoundingClientRect().height);
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref, enabled]);

  return height;
}
