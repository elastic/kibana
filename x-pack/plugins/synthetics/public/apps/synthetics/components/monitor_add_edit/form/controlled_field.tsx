/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFormRow, EuiFormRowProps } from '@elastic/eui';
import { useSelector } from 'react-redux';
import {
  UseFormReturn,
  ControllerRenderProps,
  ControllerFieldState,
  useFormContext,
} from 'react-hook-form';
import { selectServiceLocationsState } from '../../../state';
import { FieldMeta } from './config';

type Props = FieldMeta & {
  component: React.ComponentType<any>;
  field: ControllerRenderProps;
  fieldState: ControllerFieldState;
  isInvalid: boolean;
  formRowProps: Partial<EuiFormRowProps>;
  error: React.ReactNode;
  dependenciesValues: unknown[];
};

const setFieldValue = (key: string, setValue: UseFormReturn['setValue']) => (value: any) => {
  setValue(key, value);
};

export const ControlledField = ({
  component: Component,
  props,
  fieldKey,
  useSetValue,
  field,
  isInvalid,
  formRowProps,
  fieldState,
  customHook,
  error,
  dependenciesValues,
}: Props) => {
  const { setValue, reset } = useFormContext();
  const noop = () => {};
  let hook: Function = noop;
  let hookProps;
  const { locations } = useSelector(selectServiceLocationsState);
  if (customHook) {
    hookProps = customHook(field.value);
    hook = hookProps.func;
  }
  const { [hookProps?.fieldKey as string]: hookResult } = hook(hookProps?.params) || {};
  const onChange = useSetValue ? setFieldValue(fieldKey, setValue) : field.onChange;
  const generatedProps = props
    ? props({ value: field.value, setValue, reset, locations, dependencies: dependenciesValues })
    : {};
  return (
    <EuiFormRow
      {...formRowProps}
      isInvalid={hookResult || Boolean(fieldState.error)}
      error={fieldState.error?.message || error || hookProps?.error}
    >
      <Component
        {...field}
        checked={field.value}
        defaultValue={field.value}
        onChange={onChange}
        {...generatedProps}
        isInvalid={isInvalid}
        fullWidth
      />
    </EuiFormRow>
  );
};
