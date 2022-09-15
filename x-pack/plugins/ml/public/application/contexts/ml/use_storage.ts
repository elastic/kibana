/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { isDefined } from '../../../../common/types/guards';
import { useMlKibana } from '../kibana';
import type { MlStorageKey } from '../../../../common/types/storage';
import { TMlStorageMapped } from '../../../../common/types/storage';

/**
 * Hook for accessing and changing a value in the storage.
 * @param key - Storage key
 * @param initValue
 */
export function useStorage<K extends MlStorageKey, T extends TMlStorageMapped<K>>(
  key: K,
  initValue?: T
): [
  typeof initValue extends undefined
    ? TMlStorageMapped<K>
    : Exclude<TMlStorageMapped<K>, undefined>,
  (value: TMlStorageMapped<K>) => void
] {
  const {
    services: { storage },
  } = useMlKibana();

  const [val, setVal] = useState(storage.get(key) ?? initValue);

  const setStorage = useCallback((value: TMlStorageMapped<K>): void => {
    try {
      if (isDefined(value)) {
        storage.set(key, value);
        setVal(value);
      } else {
        storage.remove(key);
        setVal(initValue);
      }
    } catch (e) {
      throw new Error('Unable to update storage with provided value');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [val, setStorage];
}
