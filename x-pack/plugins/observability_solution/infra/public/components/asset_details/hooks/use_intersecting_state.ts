/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useRef, RefObject } from 'react';

export const useIntersectingState = <T>(ref: RefObject<HTMLElement>, currentState: T) => {
  const [intersectionObserverEntry, setIntersectionObserverEntry] =
    useState<IntersectionObserverEntry>();

  const curState = useRef<T>(currentState);

  const observerRef = useRef(
    new IntersectionObserver(([value]) => setIntersectionObserverEntry(value), {
      root: ref.current,
    })
  );

  useEffect(() => {
    const { current: currentObserver } = observerRef;
    currentObserver.disconnect();
    const { current } = ref;

    if (current) {
      currentObserver.observe(current);
    }

    return () => currentObserver.disconnect();
  }, [ref]);

  if (intersectionObserverEntry?.isIntersecting) {
    curState.current = currentState;
  }

  return curState.current;
};
