/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import createContainer from 'constate';

export const useIntersectionList = ({
  root = null,
  rootMargin = '0px',
  threshold = 1,
}: IntersectionObserverInit) => {
  const [observer, setObserver] = useState<IntersectionObserver | null>(null);
  const mappingRef = useRef<Map<Element, (isIntersecting: boolean) => void>>(new Map());

  useEffect(() => {
    const mappingRefCurrent = mappingRef.current;

    if (!observer) {
      setObserver(
        new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const callback = mappingRef.current.get(entry.target);
              if (callback) {
                callback(entry.isIntersecting || (entry.intersectionRatio ?? 0) === 1);
              }
            });
          },
          {
            root,
            rootMargin,
            threshold,
          }
        )
      );
    }

    return () => {
      observer?.disconnect();
      mappingRefCurrent.clear();
    };
  }, [observer, root, rootMargin, threshold]);

  return {
    observer,
    mapping: mappingRef.current,
  };
};

export const [IntersectionListProvider, useIntersectionListContext] =
  createContainer(useIntersectionList);
