/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Sometimes we don't want to fire the initial useEffect call.
 * This custom Hook only fires after the intial render has completed.
 */
import { useEffect, useRef, DependencyList } from 'react';

export const useDidUpdateEffect = (fn: Function, inputs: DependencyList) => {
  const didMountRef = useRef(false);

  useEffect(() => {
    if (didMountRef.current) {
      fn();
    } else {
      didMountRef.current = true;
    }
  }, inputs);
};
