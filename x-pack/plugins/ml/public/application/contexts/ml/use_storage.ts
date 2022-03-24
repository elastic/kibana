/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useMlKibana } from '../kibana';
import type { MlStorageKey } from '../../../../common/types/storage';

/**
 * Hook for accessing and changing a value in the storage.
 * @param key - Storage key
 * @param initValue
 */
export function useStorage<T>(key: MlStorageKey, initValue?: T): [T, (value: T) => void] {
  const {
    services: { storage },
  } = useMlKibana();

  const [val, setVal] = useState<T>(storage.get(key) ?? initValue);

  const setStorage = useCallback((value: T): void => {
    try {
      storage.set(key, value);
      setVal(value);
    } catch (e) {
      throw new Error('Unable to update storage with provided value');
    }
  }, []);

  return [val, setStorage];
}
