/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect } from 'react';
import type React from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';

export interface FormInput {
  validate: () => boolean;
}

export function validateInputs(inputs: { [k: string]: FormInput }) {
  return Object.values(inputs).reduce((acc, input) => {
    const res = input.validate();

    return acc === false ? acc : res;
  }, true);
}

export function useInput(
  defaultValue = '',
  validate?: (value: string) => string[] | undefined,
  disabled: boolean = false
) {
  const [value, setValue] = useState<string>(defaultValue);
  const [errors, setErrors] = useState<string[] | undefined>();
  const [hasChanged, setHasChanged] = useState(false);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      if (errors && validate && validate(newValue) === undefined) {
        setErrors(undefined);
      }
    },
    [errors, validate]
  );

  useEffect(() => {
    if (hasChanged) {
      return;
    }
    if (value !== defaultValue) {
      setHasChanged(true);
    }
  }, [hasChanged, value, defaultValue]);

  const isInvalid = errors !== undefined;

  return {
    value,
    errors,
    props: {
      onChange,
      value,
      isInvalid,
      disabled,
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
    hasChanged,
  };
}

export function useSwitchInput(defaultValue = false, disabled = false) {
  const [value, setValue] = useState<boolean>(defaultValue);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    if (hasChanged) {
      return;
    }
    if (value !== defaultValue) {
      setHasChanged(true);
    }
  }, [hasChanged, value, defaultValue]);

  const onChange = (e: EuiSwitchEvent) => {
    const newValue = e.target.checked;
    setValue(newValue);
  };

  const validate = useCallback(() => true, []);

  return {
    value,
    props: {
      onChange,
      checked: value,
      disabled,
    },
    validate,
    formRowProps: {},
    setValue,
    hasChanged,
  };
}

export function useComboInput(
  id: string,
  defaultValue: string[] = [],
  validate?: (value: string[]) => Array<{ message: string; index?: number }> | undefined,
  disabled = false
) {
  const [value, setValue] = useState<string[]>(defaultValue);
  const [errors, setErrors] = useState<Array<{ message: string; index?: number }> | undefined>();
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    if (hasChanged) {
      return;
    }
    if (
      value.length !== defaultValue.length ||
      value.some((val, idx) => val !== defaultValue[idx])
    ) {
      setHasChanged(true);
    }
  }, [hasChanged, value, defaultValue]);

  const isInvalid = errors !== undefined;

  const validateCallback = useCallback(() => {
    if (validate) {
      const newErrors = validate(value);
      setErrors(newErrors);

      return newErrors === undefined;
    }

    return true;
  }, [validate, value]);

  const onChange = useCallback(
    (newValues: string[]) => {
      setValue(newValues);
      if (errors && validate) {
        setErrors(validate(newValues));
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
      disabled,
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
    validate: validateCallback,
    hasChanged,
  };
}

export function useNumberInput(
  defaultValue: number | undefined,
  validate?: (value: number) => number[] | undefined,
  disabled: boolean = false
) {
  const [value, setValue] = useState<number | undefined>(defaultValue);
  const [errors, setErrors] = useState<number[] | undefined>();
  const [hasChanged, setHasChanged] = useState(false);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value ? Number(e.target.value) : undefined;
      setValue(newValue);
      if (newValue && errors && validate && validate(newValue) === undefined) {
        setErrors(undefined);
      }
    },
    [errors, validate]
  );

  useEffect(() => {
    if (hasChanged) {
      return;
    }
    if (value !== defaultValue) {
      setHasChanged(true);
    }
  }, [hasChanged, value, defaultValue]);

  const isInvalid = errors !== undefined;

  return {
    value,
    errors,
    props: {
      onChange,
      value,
      isInvalid,
      disabled,
    },
    formRowProps: {
      error: errors,
      isInvalid,
    },
    clear: () => {
      setValue(undefined);
    },
    validate: () => {
      if (validate && value) {
        const newErrors = validate(value);
        setErrors(newErrors);
        return newErrors === undefined;
      }

      return true;
    },
    setValue,
    hasChanged,
  };
}

export function useSelectInput(
  options: Array<{ value: string; text: string }>,
  defaultValue: string = '',
  disabled = false
) {
  const [value, setValue] = useState<string>(defaultValue);

  const onChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue(e.target.value);
  }, []);

  return {
    props: {
      options,
      value,
      onChange,
      disabled,
    },
    value,
    clear: () => {
      setValue('');
    },
    setValue,
  };
}
