/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

function getFromStorage<T>(keyName: string, defaultValue?: T): T {
  const storedItem = window.localStorage.getItem(keyName);

  if (storedItem !== null) {
    try {
      return JSON.parse(storedItem);
    } catch (err) {
      window.localStorage.removeItem(keyName);
      // eslint-disable-next-line no-console
      console.log(`Unable to decode: ${keyName}`);
    }
  }
  return defaultValue as T;
}

export function useLocalStorage<T>(key: string, defaultValue?: T) {
  const [storedItem, setStoredItem] = useState(() => getFromStorage(key, defaultValue));

  useEffect(() => {
    function onStorageUpdate(e: StorageEvent) {
      if (e.key === key) {
        setStoredItem((prev) => getFromStorage(key, prev));
      }
    }
    window.addEventListener('storage', onStorageUpdate);

    return () => {
      window.removeEventListener('storage', onStorageUpdate);
    };
  }, [key]);

  const setStoredItemForApi = useCallback(
    (next: T) => {
      window.localStorage.setItem(key, JSON.stringify(next));
      setStoredItem(() => next);
    },
    [key]
  );

  return useMemo(() => {
    return {
      storedItem,
      setStoredItem: setStoredItemForApi,
    };
  }, [storedItem, setStoredItemForApi]);
}
