/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash';
import { useEffect, useRef } from 'react';

export const useInterval = (callback: () => void, interval: number | null) => {
  const callbackRef = useRef(noop);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(
    () => {
      if (interval) {
        const callbackFn = () => callbackRef.current();
        const id = setInterval(callbackFn, interval);
        const cleanUpFn = () => clearInterval(id);
        return cleanUpFn;
      }
    },
    [interval]
  );
};
