/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useMemo, useCallback, useState, useContext } from 'react';
import { omit } from 'lodash';
import { isDefined } from '../../../../common/types/guards';
import { useMlKibana } from '../kibana';
import { MlStorage, ML_STORAGE_KEYS, isMlStorageKey } from '../../../../common/types/storage';
import { MlStorageKey, TMlStorageMapped } from '../../../../common/types/storage';

interface StorageAPI {
  value: MlStorage;
  setValue: <K extends MlStorageKey, T extends TMlStorageMapped<K>>(key: K, value: T) => void;
  removeValue: <K extends MlStorageKey>(key: K) => void;
}

export const MlStorageContext = React.createContext<StorageAPI>({
  value: null,
  setValue() {
    throw new Error('MlStorageContext set method is not implemented');
  },
  removeValue() {
    throw new Error('MlStorageContext remove method is not implemented');
  },
});

export const MlStorageContextProvider: FC = ({ children }) => {
  const {
    services: { storage },
  } = useMlKibana();

  const initialValue = useMemo(() => {
    return ML_STORAGE_KEYS.reduce((acc, curr) => {
      acc[curr as MlStorageKey] = storage.get(curr);
      return acc;
    }, {} as Exclude<MlStorage, null>);
  }, [storage]);

  const [state, setState] = useState<MlStorage>(initialValue);

  const setStorageValue = useCallback(
    <K extends MlStorageKey, T extends TMlStorageMapped<K>>(key: K, value: T) => {
      storage.set(key, value);

      setState((prevState) => ({
        ...prevState,
        [key]: value,
      }));
    },
    [storage]
  );

  const removeStorageValue = useCallback(
    (key: MlStorageKey) => {
      storage.remove(key);
      setState((prevState) => omit(prevState, key));
    },
    [storage]
  );

  useEffect(function updateStorageOnExternalChange() {
    const eventListener = (event: StorageEvent) => {
      if (!isMlStorageKey(event.key)) return;

      if (isDefined(event.newValue)) {
        setState((prev) => {
          return {
            ...prev,
            [event.key as MlStorageKey]:
              typeof event.newValue === 'string' ? JSON.parse(event.newValue) : event.newValue,
          };
        });
      } else {
        setState((prev) => {
          return omit(prev, event.key as MlStorageKey);
        });
      }
    };

    /**
     * This event listener is only invoked when
     * the change happens in another browser's tab.
     */
    window.addEventListener('storage', eventListener);

    return () => {
      window.removeEventListener('storage', eventListener);
    };
  }, []);

  const value: StorageAPI = useMemo(() => {
    return {
      value: state,
      setValue: setStorageValue,
      removeValue: removeStorageValue,
    };
  }, [state, setStorageValue, removeStorageValue]);

  return <MlStorageContext.Provider value={value}>{children}</MlStorageContext.Provider>;
};

/**
 * Hook for consuming a storage value
 * @param key
 * @param initValue
 */
export function useStorage<K extends MlStorageKey, T extends TMlStorageMapped<K>>(
  key: K,
  initValue?: T
): [
  typeof initValue extends undefined
    ? TMlStorageMapped<K> | undefined
    : Exclude<TMlStorageMapped<K>, undefined>,
  (value: TMlStorageMapped<K>) => void
] {
  const { value, setValue, removeValue } = useContext(MlStorageContext);

  const resultValue = useMemo(() => {
    return (value?.[key] ?? initValue) as typeof initValue extends undefined
      ? TMlStorageMapped<K> | undefined
      : Exclude<TMlStorageMapped<K>, undefined>;
  }, [value, key, initValue]);

  const setVal = useCallback(
    (v: TMlStorageMapped<K>) => {
      if (isDefined(v)) {
        setValue(key, v);
      } else {
        removeValue(key);
      }
    },
    [setValue, removeValue, key]
  );

  return [resultValue, setVal];
}
