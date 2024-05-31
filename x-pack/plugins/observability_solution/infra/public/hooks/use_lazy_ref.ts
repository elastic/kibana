/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, MutableRefObject } from 'react';

export const useLazyRef = <Type>(initializer: () => Type) => {
  const ref = useRef<Type | null>(null);
  if (ref.current === null) {
    ref.current = initializer();
  }
  return ref as MutableRefObject<Type>;
};
