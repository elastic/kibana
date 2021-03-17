/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { FormElementProps } from './form_elements';
import { LogIndexNameReference, LogIndexPatternReference, LogIndexReference } from './types';
import { FormValidationError, validateStringNotEmpty } from './validation_errors';

export interface LogIndicesConfigurationFormState {
  name: string;
  description: string;
  logIndices: LogIndexReference;
  tiebreakerField: string;
  timestampField: string;
}

type FormStateChanges = Partial<LogIndicesConfigurationFormState>;

export const useLogIndicesConfigurationFormState = ({
  initialFormState = defaultFormState,
}: {
  initialFormState?: LogIndicesConfigurationFormState;
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

  const nameFormElementProps: FormElementProps<string> = useMemo(
    () => ({
      errors: validateStringNotEmpty(formState.name),
      name: 'name',
      onChange: (name) => setFormStateChanges((changes) => ({ ...changes, name })),
      value: formState.name,
    }),
    [formState.name]
  );

  const logIndicesFormElementProps: FormElementProps<
    LogIndexNameReference | LogIndexPatternReference
  > = useMemo(() => {
    const onChange = (logIndices: LogIndexReference) =>
      setFormStateChanges((changes) => ({ ...changes, logIndices }));

    if (formState.logIndices.type === 'index-name') {
      return {
        errors: validateStringNotEmpty(formState.logIndices.indexName),
        name: 'indexNameReference',
        onChange,
        value: formState.logIndices,
      };
    } else {
      return {
        errors: validateStringNotEmpty(formState.logIndices.indexPattern),
        name: 'indexPatternReference',
        onChange,
        value: formState.logIndices,
      };
    }
  }, [formState.logIndices]);

  const tiebreakerFieldFormElementProps: FormElementProps<string> = useMemo(
    () => ({
      errors: validateStringNotEmpty(formState.tiebreakerField),
      name: `tiebreakerField`,
      onChange: (tiebreakerField) =>
        setFormStateChanges((changes) => ({ ...changes, tiebreakerField })),
      value: formState.tiebreakerField,
    }),
    [formState.tiebreakerField]
  );

  const timestampFieldFormElementProps: FormElementProps<string> = useMemo(
    () => ({
      errors: validateStringNotEmpty(formState.timestampField),
      name: `timestampField`,
      onChange: (timestampField) =>
        setFormStateChanges((changes) => ({ ...changes, timestampField })),
      value: formState.timestampField,
    }),
    [formState.timestampField]
  );

  const fieldProps = useMemo(
    () => ({
      name: nameFormElementProps,
      logIndices: logIndicesFormElementProps,
      tiebreakerField: tiebreakerFieldFormElementProps,
      timestampField: timestampFieldFormElementProps,
    }),
    [
      nameFormElementProps,
      logIndicesFormElementProps,
      tiebreakerFieldFormElementProps,
      timestampFieldFormElementProps,
    ]
  );

  const errors = useMemo(
    () =>
      Object.values(fieldProps).reduce<FormValidationError[]>(
        (accumulatedErrors, formElementProps) => [...accumulatedErrors, ...formElementProps.errors],
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

const defaultFormState: LogIndicesConfigurationFormState = {
  name: '',
  description: '',
  logIndices: {
    type: 'index-name',
    indexName: '',
  },
  tiebreakerField: '',
  timestampField: '',
};
