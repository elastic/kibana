/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState } from 'react';
import { useMlKibana } from '../kibana';

/**
 * Hook for accessing and changing a value in the storage.
 * @param key - Storage key
 * @param initValue
 */
export function useStorage(key: string, initValue?: any) {
  const {
    services: { storage },
  } = useMlKibana();

  const [val, setVal] = useState(storage.get(key) ?? initValue);

  const setStorage = useCallback((value) => {
    try {
      storage.set(key, value);
      setVal(value);
    } catch (e) {
      throw new Error('Unable to update storage with provided value');
    }
  }, []);

  return [val, setStorage];
}
