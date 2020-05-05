/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { useReducer } from 'react';

import { i18n } from '@kbn/i18n';

import { TransformPivotConfig } from '../../../../common';

const stringNotValidErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormStringNotValidErrorMessage',
  {
    defaultMessage: 'Value needs to be of type string.',
  }
);

type Validator = (arg: any) => string[];

// The way the current form is set up,
// this validator is just a sanity check,
// it should never trigger an error.
const stringValidator: Validator = arg =>
  typeof arg === 'string' ? [] : [stringNotValidErrorMessage];

const frequencyNotValidErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormFrequencyNotValidErrorMessage',
  {
    defaultMessage: 'The frequency value is not valid.',
  }
);

// Only allow frequencies in the form of 1s/1h etc.
// Note this doesn't do a check against 0s yet.
const frequencyValidator: Validator = arg => {
  return /^([0-9]+[d|h|m|s|])$/.test(arg) ? [] : [frequencyNotValidErrorMessage];
};

interface Validate {
  [key: string]: Validator;
}

const validate: Validate = {
  string: stringValidator,
  frequency: frequencyValidator,
};

interface Field {
  errorMessages: string[];
  isOptional: boolean;
  validator: keyof typeof validate;
  value: string;
}

const defaultField: Field = {
  errorMessages: [],
  isOptional: true,
  validator: 'string',
  value: '',
};

interface EditTransformFlyoutFieldsState {
  [key: string]: Field;
  description: Field;
  frequency: Field;
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
// a reset to the default value.
interface UpdateTransformPivotConfig {
  description: string;
  frequency: string;
}

// Takes in the form configuration and returns a
// request object suitable to be sent to the
// transform update API endpoint.
export const applyFormFieldsToTransformConfig = (
  config: TransformPivotConfig,
  { description, frequency }: EditTransformFlyoutFieldsState
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

  return updateConfig;
};

// Takes in a transform configuration and returns
// the default state to populate the form.
export const getDefaultState = (config: TransformPivotConfig): EditTransformFlyoutState => ({
  formFields: {
    description: { ...defaultField, value: config?.description ?? '' },
    frequency: { ...defaultField, value: config?.frequency ?? '', validator: 'frequency' },
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
const formFieldReducer = (state: Field, value: string): Field => {
  return {
    ...state,
    errorMessages: state.isOptional && value.length === 0 ? [] : validate[state.validator](value),
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
