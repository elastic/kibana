/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Hook that detects and responds to user's reduced motion preferences.
 * Listens for changes to the prefers-reduced-motion media query.
 *
 * @returns Object containing:
 * - prefersReducedMotion: boolean indicating if reduced motion is preferred
 * - getAnimationDuration: function to get 0 or the provided duration based on preference
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const getAnimationDuration = useCallback(
    (duration: number): number => {
      return prefersReducedMotion ? 0 : duration;
    },
    [prefersReducedMotion]
  );

  return {
    prefersReducedMotion,
    getAnimationDuration,
  };
}
