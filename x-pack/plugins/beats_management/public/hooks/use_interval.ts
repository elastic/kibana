/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useRef } from 'react';

export const useInterval = (callback: () => void, delay: number) => {
  const cb = useRef(callback);

  useEffect(
    () => {
      cb.current = callback;
    },
    [callback]
  );

  useEffect(
    () => {
      const id = setInterval(() => {
        cb.current();
      }, delay);
      return () => clearInterval(id);
    },
    [delay]
  );
};
