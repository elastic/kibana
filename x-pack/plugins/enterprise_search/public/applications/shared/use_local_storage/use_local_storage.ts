/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

/**
 * A hook that works like `useState`, but persisted to localStorage.
 *
 * example:
 *
 * const [foo, setFoo] = useLocalStorage("foo", "bar");
 *
 * console.log(foo) // "bar"
 * setFoo("baz")
 * console.log(foo) // "baz"
 *
 * // Navigate away from page and return
 *
 * const [foo, setFoo] = useLocalStorage("foo", "bar");
 * console.log(foo) // "baz"
 */
export const useLocalStorage = <Value>(key: string, defaultValue: Value): [Value, Function] => {
  const saveToStorage = (value: Value) => window.localStorage.setItem(key, JSON.stringify(value));
  const removeFromStorage = () => window.localStorage.removeItem(key);
  const getFromStorage = (): Value | undefined => {
    const storedItem = window.localStorage.getItem(key);
    if (!storedItem) return;

    let parsedItem;
    try {
      return JSON.parse(storedItem) as Value;
    } catch (e) {
      removeFromStorage();
    }

    return parsedItem;
  };

  const storedItem = getFromStorage();
  if (!storedItem) {
    saveToStorage(defaultValue);
  }
  const toStore = storedItem || defaultValue;

  const [item, setItem] = useState<Value>(toStore);

  const saveItem = (value: Value) => {
    saveToStorage(value);
    setItem(value);
  };

  return [item, saveItem];
};
