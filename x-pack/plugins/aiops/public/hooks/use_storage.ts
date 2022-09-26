/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useAiopsAppContext } from './use_aiops_app_context';

export const AIOPS_FROZEN_TIER_PREFERENCE = 'aiops.frozenDataTierPreference';

export type AiOps = Partial<{
  [AIOPS_FROZEN_TIER_PREFERENCE]: 'exclude_frozen' | 'include_frozen';
}> | null;

export type AiOpsKey = keyof Exclude<AiOps, null>;

/**
 * Hook for accessing and changing a value in the storage.
 * @param key - Storage key
 * @param initValue
 */
export function useStorage<T>(key: AiOpsKey, initValue?: T): [T, (value: T) => void] {
  const { storage } = useAiopsAppContext();

  const [val, setVal] = useState<T>(storage.get(key) ?? initValue);

  const setStorage = useCallback(
    (value: T): void => {
      try {
        storage.set(key, value);
        setVal(value);
      } catch (e) {
        throw new Error('Unable to update storage with provided value');
      }
    },
    [key, storage]
  );

  return [val, setStorage];
}
