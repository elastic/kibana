/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import { useEffect, useRef } from 'react';

/**
 * Track when a component is mounted/unmounted. Good for use in async processing that may update
 * a component's internal state.
 *
 * **IMPORTANT**: When used, ensure that you capture the entire `ref` object and always check
 *                the value using `isMounted.current` to ensure that you are not accessing stale.
 *                When a component is un-mounted, the hook's return value (the `ref`) is not
 *                propagated to the calling component (because its unmounting), so having the
 *                reference to the `ref` in the component allow for access to the updated value.
 *                See example below.
 *
 * @example
 *
 * const MyComponent = () => {
 *   const isMounted = useIsMounted();
 *   //...
 *   useEffect(() => {
 *     makeSomeApiCall()
 *      .then(response => {
 *        if (isMounted.current) {
 *          // Component is still mounted
 *        }
 *      })
 *   })
 * }
 */
export const useIsMounted = (): MutableRefObject<boolean> => {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
};
