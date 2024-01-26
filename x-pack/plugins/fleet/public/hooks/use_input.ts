/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect } from 'react';
import type React from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';

import type { KafkaTopicWhenType, ValueOf } from '../../common/types';

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

type MaybeSecret = string | { id: string } | undefined;

export function useSecretInput(
  initialValue: MaybeSecret,
  validate?: (value: MaybeSecret) => string[] | undefined,
  disabled: boolean = false
) {
  const [value, setValue] = useState<MaybeSecret>(initialValue);
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
    if (value !== initialValue) {
      setHasChanged(true);
    }
  }, [hasChanged, value, initialValue]);

  const isInvalid = errors !== undefined;

  return {
    value,
    errors,
    props: {
      onChange,
      value: typeof value === 'string' ? value : '',
      isInvalid,
      disabled,
    },
    formRowProps: {
      error: errors,
      isInvalid,
      initialValue,
      clear: () => {
        setValue('');
      },
    },
    cancelEdit: () => {
      setValue(initialValue || '');
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
export function useRadioInput(defaultValue: string, disabled = false) {
  const [value, setValue] = useState<string>(defaultValue);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    if (hasChanged) {
      return;
    }
    if (value !== defaultValue) {
      setHasChanged(true);
    }
  }, [hasChanged, value, defaultValue]);

  const onChange = useCallback(setValue, [setValue]);

  return {
    props: {
      idSelected: value,
      onChange,
      disabled,
    },
    setValue,
    value,
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

function useCustomInput<T>(
  id: string,
  defaultValue: T,
  validate?: (
    value: T
  ) => Array<{ message: string; index?: number; condition?: boolean }> | undefined,
  disabled = false
) {
  const [value, setValue] = useState<T>(defaultValue);
  const [errors, setErrors] = useState<
    Array<{ message: string; index?: number; condition?: boolean }> | undefined
  >();
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    if (hasChanged) {
      return;
    }
    if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
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
    (newValue: T) => {
      setValue(newValue);
      if (errors && validate) {
        setErrors(validate(newValue));
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
      setValue(defaultValue);
    },
    setValue,
    validate: validateCallback,
    hasChanged,
  };
}

export function useComboInput(
  id: string,
  defaultValue: string[] = [],
  validate?: (value: string[]) => Array<{ message: string; index?: number }> | undefined,
  disabled = false
) {
  return useCustomInput<string[]>(id, defaultValue, validate, disabled);
}

export function useKeyValueInput(
  id: string,
  defaultValue: Array<{ key: string; value: string }> = [],
  validate?: (
    value: Array<{ key: string; value: string }>
  ) =>
    | Array<{ message: string; index: number; hasKeyError: boolean; hasValueError: boolean }>
    | undefined,
  disabled = false
) {
  return useCustomInput<Array<{ key: string; value: string }>>(
    id,
    defaultValue,
    validate,
    disabled
  );
}

type Topic = Array<{
  topic: string;
  when?: {
    type?: ValueOf<KafkaTopicWhenType>;
    condition?: string;
  };
}>;

export function useTopicsInput(
  id: string,
  defaultValue: Topic = [],
  validate?: (
    value: Topic
  ) => Array<{ message: string; index: number; condition?: boolean }> | undefined,
  disabled = false
) {
  return useCustomInput<Topic>(id, defaultValue, validate, disabled);
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
