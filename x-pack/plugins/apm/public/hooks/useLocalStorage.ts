/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [item, setItem] = useState<T>(getFromStorage(key, defaultValue));

  const updateFromStorage = () => {
    const storedItem = getFromStorage(key, defaultValue);
    setItem(storedItem);
  };

  const saveToStorage = (value: T) => {
    if (value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
      updateFromStorage();
    }
  };

  useEffect(() => {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === key) {
        updateFromStorage();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // item state must be updated with a new key or default value
  useEffect(() => {
    setItem(getFromStorage(key, defaultValue));
  }, [key, defaultValue]);

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
