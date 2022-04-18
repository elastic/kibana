/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [storageUpdate, setStorageUpdate] = useState(0);

  const item = useMemo(() => {
    return getFromStorage(key, defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, storageUpdate, defaultValue]);

  const saveToStorage = (value: T) => {
    if (value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
      setStorageUpdate(storageUpdate + 1);
    }
  };

  useEffect(() => {
    function onUpdate(event: StorageEvent) {
      if (event.key === key) {
        setStorageUpdate(storageUpdate + 1);
      }
    }
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener('storage', onUpdate);
    };
  }, [key, setStorageUpdate, storageUpdate]);

  return [item, saveToStorage] as const;
}

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
