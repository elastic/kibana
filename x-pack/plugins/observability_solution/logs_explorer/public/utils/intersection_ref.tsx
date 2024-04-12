/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import useIntersection from 'react-use/lib/useIntersection';

interface IntersectionOptions<THandler extends Function> {
  onIntersecting?: THandler;
}

export function useIntersectionRef<
  ElementType extends HTMLElement = HTMLElement,
  THandler extends Function = Function
>({ onIntersecting }: IntersectionOptions<THandler> = {}) {
  const [intersectionRef, setRef] = useState<ElementType | null>(null);

  const intersection = useIntersection(
    { current: intersectionRef },
    { root: null, threshold: 0.75 }
  );

  useEffect(() => {
    if (intersection?.isIntersecting && onIntersecting) {
      onIntersecting();
    }
  }, [intersection, onIntersecting]);

  return [setRef, intersection] as [typeof setRef, IntersectionObserverEntry | null];
}

export const SpyRef = <THandler extends Function>(props: IntersectionOptions<THandler>) => {
  const [spyRef] = useIntersectionRef(props);
  return <span ref={spyRef} />;
};
