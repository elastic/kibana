/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Controller, useFormContext, FieldError, ControllerFieldState } from 'react-hook-form';
import { EuiFormRow } from '@elastic/eui';
import { selectServiceLocationsState } from '../../../state';
import { useKibanaSpace, useIsEditFlow } from '../hooks';
import { ControlledField } from './controlled_field';
import { FieldMeta } from '../types';

type Props = FieldMeta & { fieldError?: FieldError };

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
    shouldUseSetValue,
    required,
    validation,
    error,
    fieldError,
    dependencies,
    customHook,
  }: Props) => {
    const { register, watch, control, setValue, reset, getFieldState, formState } =
      useFormContext();
    const { locations } = useSelector(selectServiceLocationsState);
    const { space } = useKibanaSpace();
    const isEdit = useIsEditFlow();
    const [dependenciesFieldMeta, setDependenciesFieldMeta] = useState<
      Record<string, ControllerFieldState>
    >({});
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
    useEffect(() => {
      if (dependencies) {
        dependencies.forEach((dependency) => {
          setDependenciesFieldMeta((prevState) => ({
            ...prevState,
            [dependency]: getFieldState(dependency),
          }));
        });
      }
      // run effect when dependencies values change, to get the most up to date meta state
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(dependenciesValues || []), dependencies, getFieldState]);

    if (!show) {
      return null;
    }

    const formRowProps = {
      label,
      'aria-label': ariaLabel,
      helpText,
      fullWidth: true,
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
              shouldUseSetValue={shouldUseSetValue}
              fieldKey={fieldKey}
              customHook={customHook}
              formRowProps={formRowProps}
              fieldState={fieldStateT}
              error={error}
              dependenciesValues={dependenciesValues}
              dependenciesFieldMeta={dependenciesFieldMeta}
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
            ? props({
                field: undefined,
                formState,
                setValue,
                reset,
                locations,
                dependencies: dependenciesValues,
                dependenciesFieldMeta,
                space: space?.id,
                isEdit,
              })
            : {})}
          isInvalid={Boolean(fieldError)}
          fullWidth
        />
      </EuiFormRow>
    );
  }
);
