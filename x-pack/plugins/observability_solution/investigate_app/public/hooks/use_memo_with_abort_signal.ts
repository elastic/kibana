/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useMemo, useRef } from 'react';

export function useMemoWithAbortSignal<T>(cb: (signal: AbortSignal) => T, deps: any[]): T {
  const controllerRef = useRef(new AbortController());

  useEffect(() => {
    const controller = controllerRef.current;
    return () => {
      controller.abort();
    };
  }, []);

  return useMemo(() => {
    controllerRef.current.abort();
    controllerRef.current = new AbortController();
    return cb(controllerRef.current.signal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
