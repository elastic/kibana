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
  const getFromStorage = () => {
    const storedItem = window.localStorage.getItem(key);
    let toStore: Value = defaultValue;

    if (storedItem !== null) {
      try {
        toStore = JSON.parse(storedItem) as Value;
      } catch (err) {
        window.localStorage.removeItem(key);
      }
    }

    return toStore;
  };

  const [item, setItem] = useState<Value>(getFromStorage());

  const updateFromStorage = () => {
    const storedItem = getFromStorage();
    setItem(storedItem);
  };

  const saveToStorage = (value: Value) => {
    window.localStorage.setItem(key, JSON.stringify(value));
    updateFromStorage();
  };

  return [item, saveToStorage];
};
