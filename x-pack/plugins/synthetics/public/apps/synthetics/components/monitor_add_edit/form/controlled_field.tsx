/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiFormRow, EuiFormRowProps } from '@elastic/eui';
import { useSelector } from 'react-redux';
import {
  UseFormReturn,
  ControllerRenderProps,
  ControllerFieldState,
  useFormContext,
} from 'react-hook-form';
import { useKibanaSpace, useIsEditFlow } from '../hooks';
import { selectServiceLocationsState } from '../../../state';
import { FieldMeta, FormConfig } from '../types';

type Props = FieldMeta & {
  component: React.ComponentType<any>;
  field: ControllerRenderProps<FormConfig>;
  fieldState: ControllerFieldState;
  formRowProps: Partial<EuiFormRowProps>;
  error: React.ReactNode;
  dependenciesValues: unknown[];
  dependenciesFieldMeta: Record<string, ControllerFieldState>;
};

const setFieldValue = (key: string, setValue: UseFormReturn['setValue']) => (value: any) => {
  setValue(key, value);
};

export const ControlledField = ({
  component: FieldComponent,
  props,
  fieldKey,
  shouldUseSetValue,
  field,
  formRowProps,
  fieldState,
  customHook,
  error,
  dependenciesValues,
  dependenciesFieldMeta,
}: Props) => {
  const { setValue, reset, formState, setError, clearErrors } = useFormContext();
  const noop = () => {};
  let hook: Function = noop;
  let hookProps;
  const { locations } = useSelector(selectServiceLocationsState);
  const { space } = useKibanaSpace();
  const isEdit = useIsEditFlow();
  if (customHook) {
    hookProps = customHook(field.value);
    hook = hookProps.func;
  }
  const { [hookProps?.fieldKey as string]: hookResult } = hook(hookProps?.params) || {};
  const onChange = shouldUseSetValue ? setFieldValue(fieldKey, setValue) : field.onChange;
  const generatedProps = props
    ? props({
        field,
        setValue,
        reset,
        locations: locations.map((location) => ({ ...location, key: location.id })),
        dependencies: dependenciesValues,
        dependenciesFieldMeta,
        space: space?.id,
        isEdit,
        formState,
      })
    : {};
  const isInvalid = hookResult || Boolean(fieldState.error);
  const hookErrorContent = hookProps?.error;
  const hookError = hookResult ? hookProps?.error : undefined;

  useEffect(() => {
    if (!customHook) {
      return;
    }

    if (hookResult && !fieldState.error) {
      setError(fieldKey, { type: 'custom', message: hookErrorContent as string });
    } else if (!hookResult && fieldState.error?.message === hookErrorContent) {
      clearErrors(fieldKey);
    }
  }, [setError, fieldKey, clearErrors, fieldState, customHook, hookResult, hookErrorContent]);

  return (
    <EuiFormRow
      {...formRowProps}
      isInvalid={isInvalid}
      error={isInvalid ? hookError || fieldState.error?.message || error : undefined}
    >
      <FieldComponent
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
