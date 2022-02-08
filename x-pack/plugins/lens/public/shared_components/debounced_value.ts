/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { debounce } from 'lodash';

/**
 * Debounces value changes and updates inputValue on root state changes if no debounced changes
 * are in flight because the user is currently modifying the value.
 *
 * * allowFalsyValue: update upstream with all falsy values but null or undefined
 *
 * When testing this function mock the "debounce" function in lodash (see this module test for an example)
 */

export const useDebouncedValue = <T>(
  {
    onChange,
    value,
    defaultValue,
  }: {
    onChange: (val: T) => void;
    value: T;
    defaultValue?: T;
  },
  { allowFalsyValue }: { allowFalsyValue?: boolean } = {}
) => {
  const [inputValue, setInputValue] = useState(value);
  const unflushedChanges = useRef(false);
  const shouldUpdateWithFalsyValue = Boolean(allowFalsyValue);

  // Save the initial value
  const initialValue = useRef(defaultValue ?? value);

  const flushChangesTimeout = useRef<NodeJS.Timeout | undefined>();

  const onChangeDebounced = useMemo(() => {
    const callback = debounce((val: T) => {
      onChange(val);
      // do not reset unflushed flag right away, wait a bit for upstream to pick it up
      flushChangesTimeout.current = setTimeout(() => {
        unflushedChanges.current = false;
      }, 256);
    }, 256);
    return (val: T) => {
      if (flushChangesTimeout.current) {
        clearTimeout(flushChangesTimeout.current);
      }
      unflushedChanges.current = true;
      callback(val);
    };
  }, [onChange]);

  useEffect(() => {
    if (!unflushedChanges.current && value !== inputValue) {
      setInputValue(value);
    }
  }, [value, inputValue]);

  const handleInputChange = (val: T) => {
    setInputValue(val);
    const valueToUpload = shouldUpdateWithFalsyValue
      ? val ?? initialValue.current
      : val || initialValue.current;
    onChangeDebounced(valueToUpload);
  };

  return { inputValue, handleInputChange, initialValue: initialValue.current };
};
