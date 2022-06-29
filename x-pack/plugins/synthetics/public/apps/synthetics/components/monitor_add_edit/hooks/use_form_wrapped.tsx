/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { FieldValues, useForm, UseFormProps } from 'react-hook-form';

export function useFormWrapped<TFieldValues extends FieldValues = FieldValues, TContext = any>(
  props?: UseFormProps<TFieldValues, TContext>
) {
  const { register, ...restOfForm } = useForm(props);

  const euiRegister = useCallback(
    (name, ...registerArgs) => {
      const { ref, ...restOfRegister } = register(name, ...registerArgs);

      return {
        inputRef: ref,
        ref,
        ...restOfRegister,
      };
    },
    [register]
  );

  return {
    register: euiRegister,
    ...restOfForm,
  };
}
