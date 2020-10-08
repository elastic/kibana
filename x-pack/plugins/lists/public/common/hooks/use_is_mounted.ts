/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useRef } from 'react';

type GetIsMounted = () => boolean;

/**
 *
 * @returns A {@link GetIsMounted} getter function returning whether the component is currently mounted
 */
export const useIsMounted = (): GetIsMounted => {
  const isMounted = useRef(false);
  const getIsMounted: GetIsMounted = useCallback(() => isMounted.current, []);
  const handleCleanup = useCallback(() => {
    isMounted.current = false;
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return handleCleanup;
  }, [handleCleanup]);

  return getIsMounted;
};
