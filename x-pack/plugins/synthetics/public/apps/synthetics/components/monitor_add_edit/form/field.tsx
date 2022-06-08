/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { Controller, useFormContext, FieldError } from 'react-hook-form';
import { EuiFormRow } from '@elastic/eui';
import { selectServiceLocationsState } from '../../../state';
import { ControlledField } from './controlled_field';
import { OptionalLabel } from '../fields/optional_label';
import { FieldMeta } from './config';

type Props = FieldMeta & { fieldError: FieldError };

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
    customHook,
  }: Props) => {
    const { register, watch, control, setValue, reset } = useFormContext();
    const { locations } = useSelector(selectServiceLocationsState);
    let show = true;
    let dependenciesValues: unknown[] = [];
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
            <ControlledField
              field={field}
              component={Component}
              props={props}
              useSetValue={useSetValue}
              fieldKey={fieldKey}
              isInvalid={Boolean(fieldStateT.error)}
              customHook={customHook}
              formRowProps={formRowProps}
              fieldState={fieldStateT}
              error={error}
              dependenciesValues={dependenciesValues}
            />
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
          {...(props
            ? props({ value: '', setValue, reset, locations, dependencies: dependenciesValues })
            : {})}
          isInvalid={Boolean(fieldError)}
          fullWidth
        />
      </EuiFormRow>
    );
  }
);
