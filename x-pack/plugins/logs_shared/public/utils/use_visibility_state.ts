/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

export const useVisibilityState = (initialState: boolean) => {
  const [isVisible, setIsVisible] = useState(initialState);

  const hide = useCallback(() => setIsVisible(false), []);
  const show = useCallback(() => setIsVisible(true), []);
  const toggle = useCallback(() => setIsVisible((state) => !state), []);

  return useMemo(
    () => ({
      hide,
      isVisible,
      show,
      toggle,
    }),
    [hide, isVisible, show, toggle]
  );
};
