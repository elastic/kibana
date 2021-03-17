/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormValidationError } from './validation_errors';

export interface FormElementProps<Value> {
  errors: FormValidationError[];
  name: string;
  onChange?: (value: Value) => void;
  value: Value;
}

export const isFormElementPropsForType = <Value>(isValue: (value: any) => value is Value) => (
  formElementProps: FormElementProps<any>
): formElementProps is FormElementProps<Value> => isValue(formElementProps.value);

export const getFormRowProps = (formElement: FormElementProps<any>) => ({
  error: formElement.errors,
  isInvalid: formElement.errors.length > 0,
});

export const getInputFieldProps = <Value>(
  decodeInputValue: (value: string) => Value,
  encodeInputValue: (value: Value) => string
) => (formElement: FormElementProps<Value>) => ({
  isInvalid: formElement.errors.length > 0,
  name: formElement.name,
  onChange: (evt: React.ChangeEvent<HTMLInputElement>) =>
    formElement.onChange?.(decodeInputValue(evt.currentTarget.value)),
  value: encodeInputValue(formElement.value),
});

export const getStringInputFieldProps = getInputFieldProps<string>(
  (value) => `${value}`,
  (value) => value
);
