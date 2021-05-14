/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import _ from 'lodash';

/**
 * Debounces value changes and updates inputValue on root state changes if no debounced changes
 * are in flight because the user is currently modifying the value.
 */

export const useDebouncedValue = <T>({
  onChange,
  value,
}: {
  onChange: (val: T) => void;
  value: T;
}) => {
  const [inputValue, setInputValue] = useState(value);
  const unflushedChanges = useRef(false);

  // Save the initial value
  const initialValue = useRef(value);

  const onChangeDebounced = useMemo(() => {
    const callback = _.debounce((val: T) => {
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
    onChangeDebounced(val || initialValue.current);
  };

  return { inputValue, handleInputChange, initialValue: initialValue.current };
};
