/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

export const useAsyncEffect = (
  effect: () => Promise<void | (() => void)>,
  dependencies?: any[]
) => {
  return useEffect(() => {
    const promise = effect();
    return () => {
      promise.then(cleanup => cleanup && cleanup());
    };
  }, dependencies);
};
