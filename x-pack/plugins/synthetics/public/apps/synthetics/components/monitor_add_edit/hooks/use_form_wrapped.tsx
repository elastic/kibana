/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { FieldValues, useForm, UseFormProps, ChangeHandler } from 'react-hook-form';
import { useDebounce } from 'react-use';

export function useFormWrapped<TFieldValues extends FieldValues = FieldValues, TContext = any>(
  props?: UseFormProps<TFieldValues, TContext>
) {
  const { register, trigger, ...restOfForm } = useForm(props);

  const [changed, setChanged] = useState<boolean>(false);
  useDebounce(
    async () => {
      if (changed) {
        await trigger?.(); // Manually invalidate whole form to make dependency validations reactive
      }
    },
    500,
    [changed]
  );
  const euiOnChange = useCallback(
    (onChange: ChangeHandler) => {
      return async (event: Parameters<ChangeHandler>[0]) => {
        setChanged(false);
        const onChangeResult = await onChange(event);
        setChanged(true);

        return onChangeResult;
      };
    },
    [setChanged]
  );

  const euiRegister = useCallback(
    (name, ...registerArgs) => {
      const { ref, onChange, ...restOfRegister } = register(name, ...registerArgs);

      return {
        inputRef: ref,
        ref,
        onChange: euiOnChange(onChange),
        ...restOfRegister,
      };
    },
    [register, euiOnChange]
  );

  return {
    register: euiRegister,
    trigger,
    ...restOfForm,
  };
}
