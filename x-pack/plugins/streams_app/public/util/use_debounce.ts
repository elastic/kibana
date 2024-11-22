/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce } from 'lodash';
import { useCallback, useEffect, useState } from 'react';

export function useDebounced<T>(value: T, debounceDelay: number = 300) {
  const [debouncedValue, setValue] = useState(value);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setValueDebounced = useCallback(debounce(setValue, debounceDelay), [
    setValue,
    debounceDelay,
  ]);

  useEffect(() => {
    setValueDebounced(value);
  }, [value, setValueDebounced]);

  return debouncedValue;
}
