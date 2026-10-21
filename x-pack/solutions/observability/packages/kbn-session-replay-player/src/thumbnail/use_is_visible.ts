/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

/**
 * Whether an element has been on screen. It turns true once and stays true, so work that is done
 * on first sight is not repeated when the element scrolls away. Without IntersectionObserver the
 * element counts as visible.
 */
export const useHasBeenVisible = (element: Element | null): boolean => {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (!element || seen) {
      return undefined;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(({ isIntersecting }) => isIntersecting)) {
        setSeen(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, seen]);

  return seen;
};
