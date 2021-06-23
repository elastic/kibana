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
 */

export const useDebouncedValue = <T>(
  {
    onChange,
    value,
  }: {
    onChange: (val: T) => void;
    value: T;
  },
  { allowEmptyString }: { allowEmptyString?: boolean } = {}
) => {
  const [inputValue, setInputValue] = useState(value);
  const unflushedChanges = useRef(false);
  const shouldUpdateWithEmptyString = Boolean(allowEmptyString);

  // Save the initial value
  const initialValue = useRef(value);

  const onChangeDebounced = useMemo(() => {
    const callback = debounce((val: T) => {
      onChange(val);
      unflushedChanges.current = false;
    }, 256);
    return (val: T) => {
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
    const valueToUpload = shouldUpdateWithEmptyString
      ? val ?? initialValue.current
      : val || initialValue.current;
    onChangeDebounced(valueToUpload);
  };

  return { inputValue, handleInputChange, initialValue: initialValue.current };
};
