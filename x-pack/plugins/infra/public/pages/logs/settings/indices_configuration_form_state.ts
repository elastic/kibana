/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactNode, useCallback, useMemo, useState } from 'react';
import {
  createInputFieldProps,
  validateInputFieldNotEmpty,
} from '../../../components/source_configuration/input_fields';

interface FormState {
  name: string;
  description: string;
  logAlias: string;
  tiebreakerField: string;
  timestampField: string;
}

type FormStateChanges = Partial<FormState>;

export const useLogIndicesConfigurationFormState = ({
  initialFormState = defaultFormState,
}: {
  initialFormState?: FormState;
}) => {
  const [formStateChanges, setFormStateChanges] = useState<FormStateChanges>({});

  const resetForm = useCallback(() => setFormStateChanges({}), []);

  const formState = useMemo(
    () => ({
      ...initialFormState,
      ...formStateChanges,
    }),
    [initialFormState, formStateChanges]
  );

  const nameFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.name),
        name: 'name',
        onChange: (name) => setFormStateChanges((changes) => ({ ...changes, name })),
        value: formState.name,
      }),
    [formState.name]
  );
  const logAliasFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.logAlias),
        name: 'logAlias',
        onChange: (logAlias) => setFormStateChanges((changes) => ({ ...changes, logAlias })),
        value: formState.logAlias,
      }),
    [formState.logAlias]
  );
  const tiebreakerFieldFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.tiebreakerField),
        name: `tiebreakerField`,
        onChange: (tiebreakerField) =>
          setFormStateChanges((changes) => ({ ...changes, tiebreakerField })),
        value: formState.tiebreakerField,
      }),
    [formState.tiebreakerField]
  );
  const timestampFieldFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.timestampField),
        name: `timestampField`,
        onChange: (timestampField) =>
          setFormStateChanges((changes) => ({ ...changes, timestampField })),
        value: formState.timestampField,
      }),
    [formState.timestampField]
  );

  const fieldProps = useMemo(
    () => ({
      name: nameFieldProps,
      logAlias: logAliasFieldProps,
      tiebreakerField: tiebreakerFieldFieldProps,
      timestampField: timestampFieldFieldProps,
    }),
    [nameFieldProps, logAliasFieldProps, tiebreakerFieldFieldProps, timestampFieldFieldProps]
  );

  const errors = useMemo(
    () =>
      Object.values(fieldProps).reduce<ReactNode[]>(
        (accumulatedErrors, { error }) => [...accumulatedErrors, ...error],
        []
      ),
    [fieldProps]
  );

  const isFormValid = useMemo(() => errors.length <= 0, [errors]);

  const isFormDirty = useMemo(() => Object.keys(formStateChanges).length > 0, [formStateChanges]);

  return {
    errors,
    fieldProps,
    formState,
    formStateChanges,
    isFormDirty,
    isFormValid,
    resetForm,
  };
};

const defaultFormState: FormState = {
  name: '',
  description: '',
  logAlias: '',
  tiebreakerField: '',
  timestampField: '',
};
