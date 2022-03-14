/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText } from '@elastic/eui';
import { useField } from 'formik';
import type { FieldValidator } from 'formik';
import React from 'react';

export interface FormFieldProps<T extends React.ElementType> {
  as?: T;
  name: string;
  validate?: FieldValidator | ValidateOptions;
}

/**
 * Renders a field inside with correct inline validation states.
 *
 * @example Text field with validation rule:
 * ```typescript
 * <FormField name="initials" validate={{ required: 'Enter initials.' }} />
 * ```
 *
 * @example Color picker which uses non-standard value prop and change handler:
 * ```typescript
 * <FormField
 *   as={EuiColorPicker}
 *   name="color"
 *   color={formik.values.color}
 *   onChange={(value) => formik.setFieldValue('color', value)}
 * />
 * ```
 */
export function FormField<T extends React.ElementType = typeof EuiFieldText>({
  as,
  validate,
  onBlur,
  ...rest
}: FormFieldProps<T> & Omit<React.ComponentPropsWithoutRef<T>, keyof FormFieldProps<T>>) {
  const Component = as || EuiFieldText;

  const [field, meta, helpers] = useField({
    name: rest.name,
    validate: typeof validate === 'object' ? createFieldValidator(validate) : validate,
  });

  return (
    <Component
      isInvalid={meta.touched && !!meta.error}
      {...field}
      {...rest}
      onBlur={(event) => {
        onBlur?.(event);
        helpers.setTouched(true); // Marking as touched manually here since some EUI fields don't pass on the correct `event` argument causing errors when `field.onBlur(event)` is called as a result of spreading `field` props.
      }}
    />
  );
}

export interface ValidateOptions {
  required?: string;
  minLength?: {
    value: number;
    message: string;
  };
  maxLength?: {
    value: number;
    message: string;
  };
  min?: {
    value: number;
    message: string;
  };
  max?: {
    value: number;
    message: string;
  };
  pattern?: {
    value: RegExp;
    message: string;
  };
}

export function createFieldValidator(options: ValidateOptions): FieldValidator {
  return (value: any) => {
    if (options.required && !value) {
      return options.required;
    }
    if (options.minLength && value.length < options.minLength.value) {
      return options.minLength.message;
    }
    if (options.maxLength && value.length > options.maxLength.value) {
      return options.maxLength.message;
    }
    if (options.min && value.length < options.min.value) {
      return options.min.message;
    }
    if (options.max && value.length > options.max.value) {
      return options.max.message;
    }
    if (options.pattern && !options.pattern.value.test(value)) {
      return options.pattern.message;
    }
  };
}
