/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import type React from 'react';

export function useInput(defaultValue = '', validate?: (value: string) => string[] | undefined) {
  const [value, setValue] = useState<string>(defaultValue);
  const [errors, setErrors] = useState<string[] | undefined>();

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (errors && validate && validate(newValue) === undefined) {
      setErrors(undefined);
    }
  };

  const isInvalid = errors !== undefined;

  return {
    value,
    errors,
    props: {
      onChange,
      value,
      isInvalid,
    },
    formRowProps: {
      error: errors,
      isInvalid,
    },
    clear: () => {
      setValue('');
    },
    validate: () => {
      if (validate) {
        const newErrors = validate(value);
        setErrors(newErrors);
        return newErrors === undefined;
      }

      return true;
    },
    setValue,
  };
}

export function useComboInput(
  id: string,
  defaultValue = [],
  validate?: (value: string[]) => Array<{ message: string; index?: number }> | undefined
) {
  const [value, setValue] = useState<string[]>(defaultValue);
  const [errors, setErrors] = useState<Array<{ message: string; index?: number }> | undefined>();

  const isInvalid = errors !== undefined;

  const onChange = useCallback(
    (newValues: string[]) => {
      setValue(newValues);
      if (errors && validate && validate(newValues) === undefined) {
        setErrors(undefined);
      }
    },
    [validate, errors]
  );

  return {
    props: {
      id,
      value,
      onChange,
      errors,
      isInvalid,
    },
    value,
    clear: () => {
      setValue([]);
    },
    setValue,
    validate: () => {
      if (validate) {
        const newErrors = validate(value);
        setErrors(newErrors);

        return newErrors === undefined;
      }

      return true;
    },
  };
}
