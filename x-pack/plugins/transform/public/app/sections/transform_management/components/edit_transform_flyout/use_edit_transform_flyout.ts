/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { merge } from 'lodash';

import { useReducer } from 'react';

import { i18n } from '@kbn/i18n';

import { PostTransformsUpdateRequestSchema } from '../../../../../../common/api_schemas/update_transforms';
import { TransformPivotConfig } from '../../../../../../common/types/transform';
import { getNestedProperty, setNestedProperty } from '../../../../../../common/utils/object_utils';

// This custom hook uses nested reducers to provide a generic framework to manage form state
// and apply it to a final possibly nested configuration object suitable for passing on
// directly to an API call. For now this is only used for the transform edit form.
// Once we apply the functionality to other places, e.g. the transform creation wizard,
// the generic framework code in this file should be moved to a dedicated location.

// The outer most level reducer defines a flat structure of names for form fields.
// This is a flat structure regardless of whether the final request object will be nested.
// For example, `destinationIndex` and `destinationPipeline` will later be nested under `dest`.
interface EditTransformFlyoutFieldsState {
  [key: string]: FormField;
  description: FormField;
  destinationIndex: FormField;
  destinationPipeline: FormField;
  frequency: FormField;
  docsPerSecond: FormField;
}

// The inner reducers apply validation based on supplied attributes of each field.
export interface FormField {
  formFieldName: string;
  configFieldName: string;
  defaultValue: string;
  dependsOn: string[];
  errorMessages: string[];
  isNullable: boolean;
  isOptional: boolean;
  validator: keyof typeof validate;
  value: string;
  valueParser: (value: string) => any;
}

// The reducers and utility functions in this file provide the following features:
// - getDefaultState()
//   Sets up the initial form state. It supports overrides to apply a pre-existing configuration.
//   The implementation of this function is the only one that's specifically required to define
//   the features of the transform edit form. All other functions are generic and could be reused
//   in the future for other forms.
//
// - formReducerFactory() / formFieldReducer()
//   These nested reducers take care of updating and validating the form state.
//
// - applyFormFieldsToTransformConfig() (iterates over getUpdateValue())
//   Once a user hits the update button, these functions take care of extracting the information
//   necessary to create the update request. They take into account whether a field needs to
//   be included at all in the request (for example, if it hadn't been changed).
//   The code is also able to identify relationships/dependencies between form fields.
//   For example, if the `pipeline` field was changed, it's necessary to make the `index`
//   field part of the request, otherwise the update would fail.

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
    dependsOn: [],
    errorMessages: [],
    isNullable: false,
    isOptional: true,
    validator: 'string',
    value,
    valueParser: (v) => v,
    ...(overloads !== undefined ? { ...overloads } : {}),
  };
};

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

// Takes a value from form state and applies it to the structure
// of the expected final configuration request object.
// Considers options like if a value is nullable or optional.
const getUpdateValue = (
  attribute: keyof EditTransformFlyoutFieldsState,
  config: TransformPivotConfig,
  formState: EditTransformFlyoutFieldsState,
  enforceFormValue = false
) => {
  const formStateAttribute = formState[attribute];
  const fallbackValue = formStateAttribute.isNullable ? null : formStateAttribute.defaultValue;

  const formValue =
    formStateAttribute.value !== ''
      ? formStateAttribute.valueParser(formStateAttribute.value)
      : fallbackValue;

  const configValue = getNestedProperty(config, formStateAttribute.configFieldName, fallbackValue);

  // only get depending values if we're not already in a call to get depending values.
  const dependsOnConfig: PostTransformsUpdateRequestSchema =
    enforceFormValue === false
      ? formStateAttribute.dependsOn.reduce((_dependsOnConfig, dependsOnField) => {
          return merge(
            { ..._dependsOnConfig },
            getUpdateValue(dependsOnField, config, formState, true)
          );
        }, {})
      : {};

  if (formValue === formStateAttribute.defaultValue && formStateAttribute.isOptional) {
    return formValue !== configValue ? dependsOnConfig : {};
  }

  return formValue !== configValue || enforceFormValue
    ? setNestedProperty(dependsOnConfig, formStateAttribute.configFieldName, formValue)
    : {};
};

// Takes in the form configuration and returns a
// request object suitable to be sent to the
// transform update API endpoint.
export const applyFormFieldsToTransformConfig = (
  config: TransformPivotConfig,
  formState: EditTransformFlyoutFieldsState
): PostTransformsUpdateRequestSchema =>
  // Iterates over all form fields and only if necessary applies them to
  // the request object used for updating the transform.
  Object.keys(formState).reduce(
    (updateConfig, field) => merge({ ...updateConfig }, getUpdateValue(field, config, formState)),
    {}
  );

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
      dependsOn: ['destinationPipeline'],
      isOptional: false,
    }),
    destinationPipeline: initializeField('destinationPipeline', 'dest.pipeline', config, {
      dependsOn: ['destinationIndex'],
    }),

    // settings.*
    docsPerSecond: initializeField('docsPerSecond', 'settings.docs_per_second', config, {
      isNullable: true,
      validator: 'integerAboveZero',
      valueParser: (v) => (v === '' ? null : +v),
    }),
    maxPageSearchSize: initializeField(
      'maxPageSearchSize',
      'settings.max_page_search_size',
      config,
      {
        defaultValue: '500',
        validator: 'integerRange10To10000',
        valueParser: (v) => +v,
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
