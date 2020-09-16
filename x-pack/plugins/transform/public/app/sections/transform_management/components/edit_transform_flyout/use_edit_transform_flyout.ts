/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isEqual from 'lodash/isEqual';
import merge from 'lodash/merge';

import { useReducer } from 'react';

import { i18n } from '@kbn/i18n';

import { PostTransformsUpdateRequestSchema } from '../../../../../../common/api_schemas/update_transforms';
import { TransformPivotConfig } from '../../../../../../common/types/transform';
import { getNestedProperty, setNestedProperty } from '../../../../../../common/utils/object_utils';

// A Validator function takes in a value to check and returns an array of error messages.
// If no messages (empty array) get returned, the value is valid.
type Validator = (value: any, isOptional?: boolean) => string[];

// Note on the form validation and input components used:
// All inputs use `EuiFieldText` which means all form values will be treated as strings.
// This means we cast other formats like numbers coming from the transform config to strings,
// then revalidate them and cast them again to number before submitting a transform update.
// We do this so we have fine grained control over field validation and the option to
// cast to special values like `null` for disabling `docs_per_second`.
const numberAboveZeroNotValidErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormNumberNotValidErrorMessage',
  {
    defaultMessage: 'Value needs to be an integer above zero.',
  }
);
export const integerAboveZeroValidator: Validator = (value) =>
  !isNaN(value) && Number.isInteger(+value) && +value > 0 && !(value + '').includes('.')
    ? []
    : [numberAboveZeroNotValidErrorMessage];

const numberRange10To10000NotValidErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormNumberRange10To10000NotValidErrorMessage',
  {
    defaultMessage: 'Value needs to be an integer between 10 and 10000.',
  }
);
export const integerRange10To10000Validator: Validator = (value) =>
  integerAboveZeroValidator(value).length === 0 && +value >= 10 && +value <= 10000
    ? []
    : [numberRange10To10000NotValidErrorMessage];

const requiredErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormRequiredErrorMessage',
  {
    defaultMessage: 'Required field.',
  }
);
const stringNotValidErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormStringNotValidErrorMessage',
  {
    defaultMessage: 'Value needs to be of type string.',
  }
);
export const stringValidator: Validator = (value, isOptional = true) => {
  if (typeof value !== 'string') {
    return [stringNotValidErrorMessage];
  }

  if (value.length === 0 && !isOptional) {
    return [requiredErrorMessage];
  }

  return [];
};

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

  // only valid if one group of numbers and one group of letters
  if (regexStr === null || (Array.isArray(regexStr) && regexStr.length !== 2)) {
    return [frequencyNotValidErrorMessage];
  }

  const valueNumber = +regexStr[0];
  const valueTimeUnit = regexStr[1];

  // only valid if number is an integer above 0
  if (isNaN(valueNumber) || !Number.isInteger(valueNumber) || valueNumber === 0) {
    return [frequencyNotValidErrorMessage];
  }

  // only valid if value is up to 1 hour
  return (valueTimeUnit === 's' && valueNumber <= 3600) ||
    (valueTimeUnit === 'm' && valueNumber <= 60) ||
    (valueTimeUnit === 'h' && valueNumber === 1)
    ? []
    : [frequencyNotValidErrorMessage];
};

const validate = {
  string: stringValidator,
  frequency: frequencyValidator,
  integerAboveZero: integerAboveZeroValidator,
  integerRange10To10000: integerRange10To10000Validator,
} as const;

export interface FormField {
  formFieldName: string;
  configFieldName: string;
  defaultValue: string;
  errorMessages: string[];
  isOptional: boolean;
  validator: keyof typeof validate;
  value: string;
  valueParser: (value: string) => any;
}

export const initializeField = (
  formFieldName: string,
  configFieldName: string,
  config: TransformPivotConfig,
  overloads?: Partial<FormField>
): FormField => {
  const defaultValue = overloads?.defaultValue !== undefined ? overloads.defaultValue : '';
  const rawValue = getNestedProperty(config, configFieldName, undefined);
  const value = rawValue !== null && rawValue !== undefined ? rawValue.toString() : '';

  return {
    formFieldName,
    configFieldName,
    defaultValue,
    errorMessages: [],
    isOptional: true,
    validator: 'string',
    value,
    valueParser: (v) => v,
    ...(overloads !== undefined ? { ...overloads } : {}),
  };
};

interface EditTransformFlyoutFieldsState {
  [key: string]: FormField;
  description: FormField;
  destinationIndex: FormField;
  destinationPipeline: FormField;
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

// For form values where the attribute directly maps from the form's state to the transform
const getUpdateValue = (
  attribute: keyof EditTransformFlyoutFieldsState,
  config: TransformPivotConfig,
  formState: EditTransformFlyoutFieldsState,
  nullable: boolean = false
) => {
  const formStateAttribute = formState[attribute];
  const fallbackValue = nullable ? null : formStateAttribute.defaultValue;
  const formValue =
    formStateAttribute.value !== ''
      ? formStateAttribute.valueParser(formStateAttribute.value)
      : fallbackValue;
  const configValue = getNestedProperty(config, formStateAttribute.configFieldName, fallbackValue);
  return formValue !== configValue
    ? setNestedProperty({}, formStateAttribute.configFieldName, formValue)
    : {};
};

// Takes in the form configuration and returns a
// request object suitable to be sent to the
// transform update API endpoint.
export const applyFormFieldsToTransformConfig = (
  config: TransformPivotConfig,
  formState: EditTransformFlyoutFieldsState
): PostTransformsUpdateRequestSchema => {
  return Object.keys(formState).reduce(
    (updateConfig, field) => merge({ ...updateConfig }, getUpdateValue(field, config, formState)),
    {}
  );
};

// Takes in a transform configuration and returns
// the default state to populate the form.
export const getDefaultState = (config: TransformPivotConfig): EditTransformFlyoutState => ({
  formFields: {
    // top level attributes
    description: initializeField('description', 'description', config),
    frequency: initializeField('frequency', 'frequency', config, {
      defaultValue: '1m',
      validator: 'frequency',
    }),

    // dest.*
    destinationIndex: initializeField('destinationIndex', 'dest.index', config, {
      isOptional: false,
    }),
    destinationPipeline: initializeField('destinationPipeline', 'dest.pipeline', config),

    // settings.*
    docsPerSecond: initializeField('docsPerSecond', 'settings.docs_per_second', config, {
      validator: 'integerAboveZero',
      valueParser: (v) => parseInt(v, 10),
    }),
    maxPageSearchSize: initializeField(
      'maxPageSearchSize',
      'settings.max_page_search_size',
      config,
      {
        defaultValue: '500',
        validator: 'integerRange10To10000',
        valueParser: (v) => parseInt(v, 10),
      }
    ),
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
        : validate[state.validator](value, state.isOptional),
    value,
  };
};

// Main form reducer triggers
// - `formFieldReducer` to update the actions field
// - compares the most recent state against the original one to update `isFormTouched`
// - sets `isFormValid` to have a flag if any of the form fields contains an error.
export const formReducerFactory = (config: TransformPivotConfig) => {
  const defaultState = getDefaultState(config);
  const defaultFieldValues = Object.values(defaultState.formFields).map((f) => f.value);

  return (state: EditTransformFlyoutState, { field, value }: Action): EditTransformFlyoutState => {
    const formFields = {
      ...state.formFields,
      [field]: formFieldReducer(state.formFields[field], value),
    };

    return {
      ...state,
      formFields,
      isFormTouched: !isEqual(
        defaultFieldValues,
        Object.values(formFields).map((f) => f.value)
      ),
      isFormValid: isFormValid(formFields),
    };
  };
};

export const useEditTransformFlyout = (config: TransformPivotConfig) => {
  return useReducer(formReducerFactory(config), getDefaultState(config));
};

export type UseEditTransformFlyoutReturnType = ReturnType<typeof useEditTransformFlyout>;
