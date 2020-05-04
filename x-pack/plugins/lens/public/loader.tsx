/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useRef } from 'react';
import { EuiProgress } from '@elastic/eui';

/**
 * Executes the specified load function any time loadDeps changes. Ensures the load
 * function is never run in parallel. Shows a loading indicator while loading.
 */
export function Loader(props: { load: () => Promise<unknown>; loadDeps: unknown[] }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const prevRequest = useRef<Promise<unknown> | undefined>(undefined);
  const nextRequest = useRef<(() => void) | undefined>(undefined);

  useEffect(function performLoad() {
    if (prevRequest.current) {
      nextRequest.current = performLoad;
      return;
    }

    setIsProcessing(true);
    prevRequest.current = props
      .load()
      .catch(() => {})
      .then(() => {
        const reload = nextRequest.current;
        prevRequest.current = undefined;
        nextRequest.current = undefined;

        if (reload) {
          reload();
        } else {
          setIsProcessing(false);
        }
      });
  }, props.loadDeps);

  if (!isProcessing) {
    return null;
  }

  return <EuiProgress size="xs" color="accent" position="absolute" />;
}
