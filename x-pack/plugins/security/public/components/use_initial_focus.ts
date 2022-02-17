/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DependencyList } from 'react';
import { useEffect, useRef } from 'react';

/**
 * Creates a ref for an HTML element, which will be focussed on mount.
 *
 * @example
 * ```typescript
 * const firstInput = useInitialFocus();
 *
 * <EuiFieldText inputRef={firstInput} />
 * ```
 *
 * Pass in a dependency list to focus conditionally rendered components:
 *
 * @example
 * ```typescript
 * const firstInput = useInitialFocus([showField]);
 *
 * {showField ? <input ref={firstInput} /> : undefined}
 * ```
 */
export function useInitialFocus<T extends HTMLElement>(deps: DependencyList = []) {
  const inputRef = useRef<T>(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return inputRef;
}
