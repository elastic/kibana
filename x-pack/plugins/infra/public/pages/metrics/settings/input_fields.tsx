/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactText } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

export interface InputFieldProps<
  Value extends string = string,
  FieldElement extends HTMLInputElement = HTMLInputElement
> {
  error: React.ReactNode[];
  isInvalid: boolean;
  name: string;
  onChange?: React.ChangeEventHandler<FieldElement>;
  value?: Value;
}

export type FieldErrorMessage = string | JSX.Element;

export type ValidationHandlerList<ValueType> = Array<
  (value: ValueType) => FieldErrorMessage | false
>;

export const createInputFieldProps = <
  Value extends string = string,
  FieldElement extends HTMLInputElement = HTMLInputElement
>({
  errors,
  name,
  onChange,
  value,
}: {
  errors: FieldErrorMessage[];
  name: string;
  onChange: (newValue: string) => void;
  value: Value;
}): InputFieldProps<Value, FieldElement> => ({
  error: errors,
  isInvalid: errors.length > 0,
  name,
  onChange: (evt: React.ChangeEvent<FieldElement>) => onChange(evt.currentTarget.value),
  value,
});

export interface InputRangeFieldProps<
  Value extends ReactText = ReactText,
  FieldElement extends HTMLInputElement = HTMLInputElement,
  ButtonElement extends HTMLButtonElement = HTMLButtonElement
> {
  error: React.ReactNode[];
  isInvalid: boolean;
  name: string;
  onChange?: (
    evt:
      | React.ChangeEvent<FieldElement>
      | React.KeyboardEvent<FieldElement>
      | React.MouseEvent<ButtonElement>,
    isValid: boolean
  ) => void;
  value: Value;
}

export const createInputRangeFieldProps = <
  Value extends ReactText = ReactText,
  FieldElement extends HTMLInputElement = HTMLInputElement,
  ButtonElement extends HTMLButtonElement = HTMLButtonElement
>({
  errors,
  name,
  onChange,
  value,
}: {
  errors: FieldErrorMessage[];
  name: string;
  onChange: (newValue: number, isValid: boolean) => void;
  value: Value;
}): InputRangeFieldProps<Value, FieldElement, ButtonElement> => ({
  error: errors,
  isInvalid: errors.length > 0,
  name,
  onChange: (
    evt:
      | React.ChangeEvent<FieldElement>
      | React.KeyboardEvent<FieldElement>
      | React.MouseEvent<ButtonElement>,
    isValid: boolean
  ) => onChange(+evt.currentTarget.value, isValid),
  value,
});

export const aggregateValidationErrors =
  <ValueType extends ReactText = ReactText>(
    ...validationHandlers: ValidationHandlerList<ValueType>
  ) =>
  (value: ValueType) =>
    validationHandlers.map((validator) => validator(value)).filter(Boolean) as FieldErrorMessage[];

const isEmptyString = (value: ReactText) => value === '';

const containsSpaces = (value: string) => value.includes(' ');

const containsEmptyEntries = (value: string) => value.split(',').some(isEmptyString);

export const validateInputFieldNotEmpty = (value: ReactText) =>
  isEmptyString(value) && (
    <FormattedMessage
      id="xpack.infra.sourceConfiguration.fieldEmptyErrorMessage"
      defaultMessage="The field must not be empty."
    />
  );

export const validateInputFieldHasNotEmptyEntries = (value: string) =>
  containsEmptyEntries(value) && (
    <FormattedMessage
      id="xpack.infra.sourceConfiguration.fieldContainEmptyEntryErrorMessage"
      defaultMessage="The field must not include empty comma-separated values."
    />
  );

export const validateInputFieldHasNotEmptySpaces = (value: string) =>
  containsSpaces(value) && (
    <FormattedMessage
      id="xpack.infra.sourceConfiguration.fieldContainSpacesErrorMessage"
      defaultMessage="The field must not include spaces."
    />
  );
