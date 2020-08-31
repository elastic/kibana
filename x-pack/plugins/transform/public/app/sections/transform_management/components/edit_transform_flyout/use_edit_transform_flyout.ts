/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { useReducer } from 'react';

import { i18n } from '@kbn/i18n';

import { TransformPivotConfig } from '../../../../common';

// A Validator function takes in a value to check and returns an array of error messages.
// If no messages (empty array) get returned, the value is valid.
type Validator = (arg: any) => string[];

// Note on the form validation and input components used:
// All inputs use `EuiFieldText` which means all form values will be treated as strings.
// This means we cast other formats like numbers coming from the transform config to strings,
// then revalidate them and cast them again to number before submitting a transform update.
// We do this so we have fine grained control over field validation and the option to
// cast to special values like `null` for disabling `docs_per_second`.
const numberAboveZeroNotValidErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormNumberNotValidErrorMessage',
  {
    defaultMessage: 'Value needs to be a number above zero.',
  }
);
export const numberAboveZeroValidator: Validator = (arg) =>
  !isNaN(arg) && parseInt(arg, 10) > 0 ? [] : [numberAboveZeroNotValidErrorMessage];

// The way the current form is set up, this validator is just a sanity check,
// it should never trigger an error, because `EuiFieldText` always returns a string.
const stringNotValidErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormStringNotValidErrorMessage',
  {
    defaultMessage: 'Value needs to be of type string.',
  }
);
const stringValidator: Validator = (arg) =>
  typeof arg === 'string' ? [] : [stringNotValidErrorMessage];

// Only allow frequencies in the form of 1s/1h etc.
const frequencyNotValidErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormFrequencyNotValidErrorMessage',
  {
    defaultMessage: 'The frequency value is not valid.',
  }
);
export const frequencyValidator: Validator = (arg) => {
  if (typeof arg !== 'string' || arg === null) {
    return [stringNotValidErrorMessage];
  }

  // split string by groups of numbers and letters
  const regexStr = arg.match(/[a-z]+|[^a-z]+/gi);

  return (
    // only valid if one group of numbers and one group of letters
    regexStr !== null &&
      regexStr.length === 2 &&
      // only valid if time unit is one of s/m/h
      ['s', 'm', 'h'].includes(regexStr[1]) &&
      // only valid if number is between 1 and 59
      parseInt(regexStr[0], 10) > 0 &&
      parseInt(regexStr[0], 10) < 60 &&
      // if time unit is 'h' then number must not be higher than 1
      !(parseInt(regexStr[0], 10) > 1 && regexStr[1] === 'h')
      ? []
      : [frequencyNotValidErrorMessage]
  );
};

type Validators = 'string' | 'frequency' | 'numberAboveZero';

type Validate = {
  [key in Validators]: Validator;
};

const validate: Validate = {
  string: stringValidator,
  frequency: frequencyValidator,
  numberAboveZero: numberAboveZeroValidator,
};

export interface FormField {
  errorMessages: string[];
  isOptional: boolean;
  validator: keyof Validate;
  value: string;
}

const defaultField: FormField = {
  errorMessages: [],
  isOptional: true,
  validator: 'string',
  value: '',
};

interface EditTransformFlyoutFieldsState {
  [key: string]: FormField;
  description: FormField;
  frequency: FormField;
  docsPerSecond: FormField;
}

export interface EditTransformFlyoutState {
  formFields: EditTransformFlyoutFieldsState;
  isFormTouched: boolean;
  isFormValid: boolean;
}

// This is not a redux type action,
// since for now we only have one action type.
interface Action {
  field: keyof EditTransformFlyoutFieldsState;
  value: string;
}

// Some attributes can have a value of `null` to trigger
// a reset to the default value, or in the case of `docs_per_second`
// `null` is used to disable throttling.
interface UpdateTransformPivotConfig {
  description: string;
  frequency: string;
  settings: {
    docs_per_second: number | null;
  };
}

// Takes in the form configuration and returns a
// request object suitable to be sent to the
// transform update API endpoint.
export const applyFormFieldsToTransformConfig = (
  config: TransformPivotConfig,
  { description, docsPerSecond, frequency }: EditTransformFlyoutFieldsState
): Partial<UpdateTransformPivotConfig> => {
  const updateConfig: Partial<UpdateTransformPivotConfig> = {};

  // set the values only if they changed from the default
  // and actually differ from the previous value.
  if (
    !(config.frequency === undefined && frequency.value === '') &&
    config.frequency !== frequency.value
  ) {
    updateConfig.frequency = frequency.value;
  }

  if (
    !(config.description === undefined && description.value === '') &&
    config.description !== description.value
  ) {
    updateConfig.description = description.value;
  }

  // if the input field was left empty,
  // fall back to the default value of `null`
  // which will disable throttling.
  const docsPerSecondFormValue =
    docsPerSecond.value !== '' ? parseInt(docsPerSecond.value, 10) : null;
  const docsPerSecondConfigValue = config.settings?.docs_per_second ?? null;
  if (docsPerSecondFormValue !== docsPerSecondConfigValue) {
    updateConfig.settings = { docs_per_second: docsPerSecondFormValue };
  }

  return updateConfig;
};

// Takes in a transform configuration and returns
// the default state to populate the form.
export const getDefaultState = (config: TransformPivotConfig): EditTransformFlyoutState => ({
  formFields: {
    description: { ...defaultField, value: config?.description ?? '' },
    frequency: { ...defaultField, value: config?.frequency ?? '', validator: 'frequency' },
    docsPerSecond: {
      ...defaultField,
      value: config?.settings?.docs_per_second?.toString() ?? '',
      validator: 'numberAboveZero',
    },
  },
  isFormTouched: false,
  isFormValid: true,
});

// Checks each form field for error messages to return
// if the overall form is valid or not.
const isFormValid = (fieldsState: EditTransformFlyoutFieldsState) =>
  Object.keys(fieldsState).reduce((p, c) => p && fieldsState[c].errorMessages.length === 0, true);

// Updates a form field with its new value,
// runs validation and populates
// `errorMessages` if any errors occur.
const formFieldReducer = (state: FormField, value: string): FormField => {
  return {
    ...state,
    errorMessages:
      state.isOptional && typeof value === 'string' && value.length === 0
        ? []
        : validate[state.validator](value),
    value,
  };
};

// Main form reducer triggers
// - `formFieldReducer` to update the actions field
// - compares the most recent state against the original one to update `isFormTouched`
// - sets `isFormValid` to have a flag if any of the form fields contains an error.
export const formReducerFactory = (config: TransformPivotConfig) => {
  const defaultState = getDefaultState(config);
  return (state: EditTransformFlyoutState, { field, value }: Action): EditTransformFlyoutState => {
    const formFields = {
      ...state.formFields,
      [field]: formFieldReducer(state.formFields[field], value),
    };

    return {
      ...state,
      formFields,
      isFormTouched: !isEqual(defaultState.formFields, formFields),
      isFormValid: isFormValid(formFields),
    };
  };
};

export const useEditTransformFlyout = (config: TransformPivotConfig) => {
  return useReducer(formReducerFactory(config), getDefaultState(config));
};

export type UseEditTransformFlyoutReturnType = ReturnType<typeof useEditTransformFlyout>;
