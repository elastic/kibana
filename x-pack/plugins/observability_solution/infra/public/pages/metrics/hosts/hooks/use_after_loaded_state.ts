/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef } from 'react';

export const useAfterLoadedState = <T>(loading: boolean, state: T) => {
  const ref = useRef<boolean | undefined>(undefined);
  const [internalState, setInternalState] = useState(state);

  if (!ref.current || loading !== ref.current) {
    ref.current = loading;
  }

  useEffect(() => {
    if (!loading) {
      setInternalState(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current]);

  return { afterLoadedState: internalState };
};
