/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { Controller, UseFormReturn, useFormContext, FieldError } from 'react-hook-form';
import { EuiFormRow } from '@elastic/eui';
import { ControlledField } from './controlled_field';
import { OptionalLabel } from '../fields/optional_label';

interface Props {
  component: React.ComponentType<any>;
  helpText?: React.ReactNode;
  ariaLabel?: string;
  label?: string;
  props?: any;
  fieldKey: string;
  useSetValue?: boolean;
  showWhen?: [string, any];
  controlled?: boolean;
  required?: boolean;
  validation?: (dependencies: unknown[]) => Parameters<UseFormReturn['register']>[1];
  error?: React.ReactNode;
  fieldError?: FieldError;
  dependencies?: string[];
}

export const Field = memo<Props>(
  ({
    component: Component,
    helpText,
    label,
    ariaLabel,
    props,
    fieldKey,
    controlled,
    showWhen,
    useSetValue,
    required,
    validation,
    error,
    fieldError,
    dependencies,
  }: Props) => {
    const { register, watch, control } = useFormContext();
    let show = true;
    let dependenciesValues = [];
    if (showWhen) {
      const [showKey, expectedValue] = showWhen;
      const [actualValue] = watch([showKey]);
      show = actualValue === expectedValue;
    }
    if (dependencies) {
      dependenciesValues = watch(dependencies);
    }

    if (!show) {
      return null;
    }

    const formRowProps = {
      label,
      'aria-label': ariaLabel,
      helpText,
      fullWidth: true,
      labelAppend: !required ? <OptionalLabel /> : undefined,
    };

    return controlled ? (
      <Controller
        control={control}
        name={fieldKey}
        rules={{
          required,
          ...(validation ? validation(dependenciesValues) : {}),
        }}
        render={({ field, fieldState: fieldStateT }) => {
          return (
            <EuiFormRow
              {...formRowProps}
              isInvalid={Boolean(fieldStateT.error)}
              error={fieldStateT.error?.message || error}
            >
              <ControlledField
                field={field}
                component={Component}
                props={props}
                useSetValue={useSetValue}
                fieldKey={fieldKey}
                isInvalid={Boolean(fieldStateT.error)}
              />
            </EuiFormRow>
          );
        }}
      />
    ) : (
      <EuiFormRow
        {...formRowProps}
        isInvalid={Boolean(fieldError)}
        error={fieldError?.message || error}
      >
        <Component
          {...register(fieldKey, {
            required,
            ...(validation ? validation(dependenciesValues) : {}),
          })}
          {...(props ? props() : {})}
          isInvalid={Boolean(fieldError)}
          fullWidth
        />
      </EuiFormRow>
    );
  }
);
