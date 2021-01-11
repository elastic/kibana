/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';

export const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const [item, setItem] = useState<T>(getFromStorage());

  function getFromStorage() {
    const storedItem = window.localStorage.getItem(key);
    let toStore: T = defaultValue;

    if (storedItem !== null) {
      try {
        toStore = JSON.parse(storedItem) as T;
      } catch (err) {
        window.localStorage.removeItem(key);
      }
    }

    return toStore;
  }

  const updateFromStorage = () => {
    const storedItem = getFromStorage();
    setItem(storedItem);
  };

  const saveToStorage = (value: T) => {
    window.localStorage.setItem(key, JSON.stringify(value));
    updateFromStorage();
  };

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === key) {
        updateFromStorage();
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return [item, saveToStorage] as const;
};
