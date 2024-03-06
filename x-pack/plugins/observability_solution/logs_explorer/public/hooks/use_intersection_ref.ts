/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import useIntersection from 'react-use/lib/useIntersection';

interface IntersectionOptions {
  onIntersecting?: () => void;
}

export function useIntersectionRef<ElementType extends HTMLElement = HTMLButtonElement>({
  onIntersecting,
}: IntersectionOptions = {}) {
  const [intersectionRef, setRef] = useState<ElementType | null>(null);

  const intersection = useIntersection(
    { current: intersectionRef },
    { root: null, threshold: 0.5 }
  );

  useEffect(() => {
    if (intersection?.isIntersecting && onIntersecting) {
      onIntersecting();
    }
  }, [intersection, onIntersecting]);

  return [setRef, intersection] as [typeof setRef, IntersectionObserverEntry | null];
}
