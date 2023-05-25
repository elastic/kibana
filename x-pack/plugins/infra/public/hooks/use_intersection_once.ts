/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefObject, useEffect, useState } from 'react';
import useIntersection from 'react-use/lib/useIntersection';

export const useIntersectedOnce = (
  ref: RefObject<HTMLElement>,
  options: IntersectionObserverInit
) => {
  const [intersectedOnce, setIntersectedOnce] = useState(false);
  const intersection = useIntersection(ref, options);

  useEffect(() => {
    if (!intersectedOnce && (intersection?.intersectionRatio ?? 0) > 0) {
      setIntersectedOnce(true);
    }
  }, [intersectedOnce, intersection?.intersectionRatio]);

  return { intersectedOnce, intersection };
};
