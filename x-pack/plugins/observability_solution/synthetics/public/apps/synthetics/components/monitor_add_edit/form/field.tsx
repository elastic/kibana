import { EuiFormRow } from '@elastic/eui';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { Controller, FieldError, useFormContext } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { selectServiceLocationsState } from '../../../state';
import { useIsEditFlow, useKibanaSpace, useValidateField } from '../hooks';
import { FieldMeta, FormConfig } from '../types';
import { ControlledField } from './controlled_field';

type Props = FieldMeta<any> & { fieldError?: FieldError };

export const Field = memo<Props>(
  ({
    component: Component,
    helpText,
    label,
    ariaLabel,
    props,
    fieldKey,
    controlled,
    required,
    validation,
    error: validationError,
    fieldError,
    dependencies,
    customHook,
    hidden,
  }: Props) => {
    const { register, control, setValue, reset, formState, trigger } = useFormContext<FormConfig>();
    const { locations } = useSelector(selectServiceLocationsState);
    const { space } = useKibanaSpace();
    const isEdit = useIsEditFlow();

    const { dependenciesValues, dependenciesFieldMeta, error, isInvalid, rules } = useValidateField(
      {
        fieldKey,
        validation,
        dependencies,
        required: required ?? false,
        customHook,
        validationError,
      }
    );

    if (hidden && hidden(dependenciesValues)) {
      return null;
    }

    const formRowProps = {
      label,
      'aria-label': ariaLabel,
      helpText,
      fullWidth: true,
    };

    return controlled ? (
      <Controller<FormConfig, keyof FormConfig>
        control={control}
        name={fieldKey}
        rules={rules}
        render={({ field, fieldState: fieldStateT }) => {
          return (
            <ControlledField
              field={field}
              component={Component}
              props={props}
              fieldKey={fieldKey}
              formRowProps={formRowProps}
              fieldState={fieldStateT}
              error={error}
              isInvalid={isInvalid}
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
          {...register(fieldKey, rules)}
          {...(props
            ? props({
                field: undefined,
                formState,
                setValue,
                trigger,
                reset,
                locations: locations.map((location) => ({ ...location, key: location.id })),
                dependencies: dependenciesValues,
                dependenciesFieldMeta,
                space: space?.id,
                isEdit,
              })
            : {})}
          isInvalid={isInvalid}
          fullWidth
        />
      </EuiFormRow>
    );
  }
);
