/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import useIntersection from 'react-use/lib/useIntersection';

export function useIntersectionRef<ElementType extends HTMLElement = HTMLButtonElement>() {
  const [intersectionRef, setRef] = useState<ElementType | null>(null);

  const intersection = useIntersection(
    { current: intersectionRef },
    { root: null, threshold: 0.5 }
  );

  return [intersection, setRef] as [IntersectionObserverEntry | null, typeof setRef];
}
