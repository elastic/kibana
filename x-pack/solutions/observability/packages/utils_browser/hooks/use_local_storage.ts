/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

type AllowedValue = string | number | boolean | Record<string, any> | any[];

function createInMemorySubject<T extends AllowedValue>(key: string, defaultValue: T) {
  const currentValue = getFromStorage(key, defaultValue);

  const subject$ = new BehaviorSubject(currentValue);

  function onStorageUpdate(event: StorageEvent) {
    if (event.storageArea === window.localStorage && event.key === key) {
      subject$.next(event.newValue ? JSON.parse(event.newValue) : defaultValue);
    }
  }

  window.addEventListener('storage', onStorageUpdate);

  return {
    asObservable: () => subject$.asObservable(),
    get: () => subject$.value,
    next: (value: T | ((prev: T) => T)) => {
      const nextValue = typeof value === 'function' ? value(subject$.value) : value;
      window.localStorage.setItem(key, JSON.stringify(value));
      subject$.next(nextValue);
    },
  };
}

const createInMemorySubjectMemoized = memoize(
  createInMemorySubject,
  (key: string, defaultValue?: unknown) => key
);

export function clearUseLocalStorageCache() {
  return createInMemorySubjectMemoized.cache.clear?.();
}

type SetValue<T extends AllowedValue> = (next: T | ((prev: T) => T)) => void;

export function useLocalStorage<T extends AllowedValue>(
  key: string,
  defaultValue: T | (() => T)
): [T, SetValue<T>] {
  const defaultValueRef = useRef<T>(
    typeof defaultValue === 'function' ? defaultValue() : defaultValue
  );

  const subject = useMemo(() => {
    return createInMemorySubjectMemoized(key, defaultValueRef.current);
  }, [key]);

  const [value, setValue] = useState(() => subject.get());

  useEffect(() => {
    const subscription = subject.asObservable().subscribe((next) => {
      setValue(next);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [subject]);

  const setter = useMemo(() => {
    return (valueOrCallback: T | ((prev: T) => T)) => {
      const val =
        typeof valueOrCallback === 'function' ? valueOrCallback(subject.get()) : valueOrCallback;
      subject.next(val);
    };
  }, [subject]);

  return [value, setter];
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
