/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { Size } from '../model/stage_fit';

const EMPTY_SIZE: Size = { width: 0, height: 0 };

/** Tracks the content box of an element; reports an empty size where ResizeObserver is missing. */
export const useElementSize = (element: HTMLElement | null): Size => {
  const [size, setSize] = useState<Size>(EMPTY_SIZE);

  useEffect(() => {
    if (!element) {
      setSize(EMPTY_SIZE);
      return undefined;
    }
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height }
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return size;
};
