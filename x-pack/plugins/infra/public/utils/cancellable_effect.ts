/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DependencyList, useEffect } from 'react';

export const createCancellationSignal = () => {
  const cancellationSignal = {
    isCancelled: false,
    cancel: () => {
      cancellationSignal.isCancelled = true;
    },
  };

  return cancellationSignal;
};

export const useCancellableEffect = (
  effect: (isCancelled: () => boolean) => void,
  deps?: DependencyList
): void => {
  useEffect(() => {
    const cancellationSignal = createCancellationSignal();

    effect(() => cancellationSignal.isCancelled);

    return cancellationSignal.cancel;

    // the dependencies are managed externally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
