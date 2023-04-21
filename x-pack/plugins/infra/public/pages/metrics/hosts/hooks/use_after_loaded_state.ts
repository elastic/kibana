/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { useState } from 'react';
import useCustomCompareEffect from 'react-use/lib/useCustomCompareEffect';

export const useAfterLoadedState = <T>(loading: boolean, state: T) => {
  const [internalState, setInternalState] = useState(state);

  useCustomCompareEffect(
    () => {
      if (!loading) {
        setInternalState(state);
      }
    },
    [loading],
    (prevDeps, nextDeps) => isEqual(prevDeps, nextDeps)
  );

  return { afterLoadedState: internalState };
};
