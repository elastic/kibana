/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export function useInput(defaultValue = '', validate?: (value: string) => string[] | undefined) {
  const [value, setValue] = React.useState<string>(defaultValue);
  const [errors, setErrors] = React.useState<string[] | undefined>();

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
  defaultValue = [],
  validate?: (value: string[]) => string[] | undefined
) {
  const [value, setValue] = React.useState<string[]>(defaultValue);
  const [errors, setErrors] = React.useState<string[] | undefined>();

  const isInvalid = errors !== undefined;

  return {
    props: {
      selectedOptions: value.map((val: string) => ({ label: val })),
      onCreateOption: (newVal: any) => {
        setValue([...value, newVal]);
      },
      onChange: (newSelectedOptions: any[]) => {
        const newValues = newSelectedOptions.map((option) => option.label);
        setValue(newValues);
        if (errors && validate && validate(newValues) === undefined) {
          setErrors(undefined);
        }
      },
      isInvalid,
    },
    formRowProps: {
      error: errors,
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
