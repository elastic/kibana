/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

function getFromStorage<T>(keyName: string, defaultValue: T) {
  const storedItem = window.localStorage.getItem(keyName);

  if (storedItem !== null) {
    try {
      return JSON.parse(storedItem) as T;
    } catch (err) {
      window.localStorage.removeItem(keyName);
      // eslint-disable-next-line no-console
      console.log(`Unable to decode: ${keyName}`);
    }
  }
  return defaultValue;
}

export function useLocalStorage<T>(key: string, defaultValue: T | undefined) {
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

  return useMemo(() => {
    return {
      storedItem,
      setStoredItem: (next: T) => {
        window.localStorage.setItem(key, JSON.stringify(next));
        setStoredItem(() => next);
      },
    };
  }, [key, storedItem]);
}
