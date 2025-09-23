/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { Subject, filter, map } from 'rxjs';

const intersectionSubject$ = new Subject<IntersectionObserverEntry>();

let VIEWPORT_OBSERVER: IntersectionObserver;

interface UseIntersectionObserverOptions {
  target?: HTMLElement | null;
}

export function useIntersectionObserver({ target }: UseIntersectionObserverOptions) {
  // Lazily initialise this only when it is being used, as IntersectionObservers are not
  // exactly light-weight
  VIEWPORT_OBSERVER ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      intersectionSubject$.next(entry);
    }
  });

  const [intersected, setIntersected] = useState(false);

  const observeTargetEntry$ = useMemo(
    () =>
      intersectionSubject$.pipe(
        filter((entry) => entry.target === target),
        map((entry) => entry.isIntersecting)
      ),
    [target]
  );

  useEffect(() => {
    const subscription = observeTargetEntry$.subscribe(setIntersected);
    return () => subscription.unsubscribe();
  }, [observeTargetEntry$]);

  useEffect(() => {
    if (target) VIEWPORT_OBSERVER.observe(target);

    return () => {
      if (target) VIEWPORT_OBSERVER.unobserve(target);
    };
  }, [target]);

  return {
    intersected,
  };
}
