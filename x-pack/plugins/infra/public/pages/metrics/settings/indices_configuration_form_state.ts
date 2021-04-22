/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode, useCallback, useMemo, useState } from 'react';
import {
  createInputFieldProps,
  createInputRangeFieldProps,
  validateInputFieldNotEmpty,
} from './input_fields';

interface FormState {
  name: string;
  description: string;
  metricAlias: string;
  containerField: string;
  hostField: string;
  podField: string;
  tiebreakerField: string;
  timestampField: string;
  anomalyThreshold: number;
}

type FormStateChanges = Partial<FormState>;

export const useIndicesConfigurationFormState = ({
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
  const metricAliasFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.metricAlias),
        name: 'metricAlias',
        onChange: (metricAlias) => setFormStateChanges((changes) => ({ ...changes, metricAlias })),
        value: formState.metricAlias,
      }),
    [formState.metricAlias]
  );
  const containerFieldFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.containerField),
        name: `containerField`,
        onChange: (containerField) =>
          setFormStateChanges((changes) => ({ ...changes, containerField })),
        value: formState.containerField,
      }),
    [formState.containerField]
  );
  const hostFieldFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.hostField),
        name: `hostField`,
        onChange: (hostField) => setFormStateChanges((changes) => ({ ...changes, hostField })),
        value: formState.hostField,
      }),
    [formState.hostField]
  );
  const podFieldFieldProps = useMemo(
    () =>
      createInputFieldProps({
        errors: validateInputFieldNotEmpty(formState.podField),
        name: `podField`,
        onChange: (podField) => setFormStateChanges((changes) => ({ ...changes, podField })),
        value: formState.podField,
      }),
    [formState.podField]
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
  const anomalyThresholdFieldProps = useMemo(
    () =>
      createInputRangeFieldProps({
        errors: validateInputFieldNotEmpty(formState.anomalyThreshold),
        name: 'anomalyThreshold',
        onChange: (anomalyThreshold) =>
          setFormStateChanges((changes) => ({ ...changes, anomalyThreshold })),
        value: formState.anomalyThreshold,
      }),
    [formState.anomalyThreshold]
  );

  const fieldProps = useMemo(
    () => ({
      name: nameFieldProps,
      metricAlias: metricAliasFieldProps,
      containerField: containerFieldFieldProps,
      hostField: hostFieldFieldProps,
      podField: podFieldFieldProps,
      tiebreakerField: tiebreakerFieldFieldProps,
      timestampField: timestampFieldFieldProps,
      anomalyThreshold: anomalyThresholdFieldProps,
    }),
    [
      nameFieldProps,
      metricAliasFieldProps,
      containerFieldFieldProps,
      hostFieldFieldProps,
      podFieldFieldProps,
      tiebreakerFieldFieldProps,
      timestampFieldFieldProps,
      anomalyThresholdFieldProps,
    ]
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
  metricAlias: '',
  containerField: '',
  hostField: '',
  podField: '',
  tiebreakerField: '',
  timestampField: '',
  anomalyThreshold: 0,
};
