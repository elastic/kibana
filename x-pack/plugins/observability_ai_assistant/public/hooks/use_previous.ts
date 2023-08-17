/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';

export function usePrevious(value: string | number | undefined) {
  const ref = useRef<string | number | undefined>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
