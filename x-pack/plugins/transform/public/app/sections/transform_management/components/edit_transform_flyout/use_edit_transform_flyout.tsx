/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, merge } from 'lodash';
import React, { useEffect, type FC } from 'react';
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector, useStore, Provider } from 'react-redux';
import { bindActionCreators } from 'redux';

import { getNestedProperty, setNestedProperty } from '@kbn/ml-nested-property';

import { PostTransformsUpdateRequestSchema } from '../../../../../../common/api_schemas/update_transforms';
import {
  DEFAULT_TRANSFORM_FREQUENCY,
  DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE,
} from '../../../../../../common/constants';
import { TransformConfigUnion } from '../../../../../../common/types/transform';

// Note on the form validation and input components used:
// All inputs use `EuiFieldText` which means all form values will be treated as strings.
// This means we cast other formats like numbers coming from the transform config to strings,
// then revalidate them and cast them again to number before submitting a transform update.
// We do this so we have fine grained control over field validation and the option to
// cast to special values like `null` for disabling `docs_per_second`.
import {
  frequencyValidator,
  integerAboveZeroValidator,
  transformSettingsNumberOfRetriesValidator,
  transformSettingsPageSearchSizeValidator,
  retentionPolicyMaxAgeValidator,
  stringValidator,
  type Validator,
} from '../../../../common/validators';

type DefaultParser = (v: string) => string;
type NullableNumberParser = (v: string) => number | null;
type NumberParser = (v: string) => number;
type ValueParser = DefaultParser | NullableNumberParser | NumberParser;

const defaultParser: DefaultParser = (v) => v;
const nullableNumberParser: NullableNumberParser = (v) => (v === '' ? null : +v);
const numberParser: NumberParser = (v) => +v;

// This custom hook uses redux-toolkit to provide a generic framework to manage form state
// and apply it to a final possibly nested configuration object suitable for passing on
// directly to an API call. For now this is only used for the transform edit form.
// Once we apply the functionality to other places, e.g. the transform creation wizard,
// the generic framework code in this file should be moved to a dedicated location.

// The form state defines a flat structure of names for form fields.
// This is a flat structure regardless of whether the final config object will be nested.
// For example, `destinationIndex` and `destinationIngestPipeline` will later be nested under `dest`.
export type EditTransformFormFields =
  | 'description'
  | 'destinationIndex'
  | 'destinationIngestPipeline'
  | 'docsPerSecond'
  | 'frequency'
  | 'maxPageSearchSize'
  | 'numFailureRetries'
  | 'retentionPolicyField'
  | 'retentionPolicyMaxAge';

type EditTransformFlyoutFieldsState = Record<EditTransformFormFields, FormField>;

export interface FormField {
  formFieldName: EditTransformFormFields;
  configFieldName: string;
  defaultValue: string;
  dependsOn: EditTransformFormFields[];
  errorMessages: string[];
  isNullable: boolean;
  isOptional: boolean;
  section?: EditTransformFormSections;
  validator: Validator;
  value: string;
  valueParser: ValueParser;
}

// Defining these sections is only necessary for options where a reset/deletion of that part of the
// configuration is supported by the API. For example, this isn't suitable to use with `dest` since
// this overall part of the configuration is not optional. However, `retention_policy` is optional,
// so we need to support to recognize this based on the form state and be able to reset it by
// created a request body containing `{ retention_policy: null }`.
type EditTransformFormSections = 'retentionPolicy';

export interface FormSection {
  formSectionName: EditTransformFormSections;
  configFieldName: string;
  defaultEnabled: boolean;
  enabled: boolean;
}

type EditTransformFlyoutSectionsState = Record<EditTransformFormSections, FormSection>;

// The utility functions in this file provide the following features:
// - getDefaultState()
//   Sets up the initial form state. It supports overrides to apply a pre-existing configuration.
//   The implementation of this function is the only one that's specifically required to define
//   the features of the transform edit form. All other functions are generic and could be reused
//   in the future for other forms.
//
// - applyFormStateToTransformConfig() (iterates over getUpdateValue())
//   Once a user hits the update button, these functions take care of extracting the information
//   necessary to create the update request. They take into account whether a field needs to
//   be included at all in the request (for example, if it hadn't been changed).
//   The code is also able to identify relationships/dependencies between form fields.
//   For example, if the `pipeline` field was changed, it's necessary to make the `index`
//   field part of the request, otherwise the update would fail.

export const initializeFormField = (
  formFieldName: EditTransformFormFields,
  configFieldName: string,
  config: TransformConfigUnion,
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
    validator: stringValidator,
    value,
    valueParser: defaultParser,
    ...(overloads !== undefined ? { ...overloads } : {}),
  };
};

export const initializeFormSection = (
  formSectionName: EditTransformFormSections,
  configFieldName: string,
  config: TransformConfigUnion,
  overloads?: Partial<FormSection>
): FormSection => {
  const defaultEnabled = overloads?.defaultEnabled ?? false;
  const rawEnabled = getNestedProperty(config, configFieldName, undefined);
  const enabled = rawEnabled !== undefined && rawEnabled !== null;

  return {
    formSectionName,
    configFieldName,
    defaultEnabled,
    enabled,
  };
};

// Takes a value from form state and applies it to the structure
// of the expected final configuration request object.
// Considers options like if a value is nullable or optional.
const getUpdateValue = (
  attribute: EditTransformFormFields,
  config: TransformConfigUnion,
  formFields: EditTransformFlyoutFieldsState,
  formSections: EditTransformFlyoutSectionsState,
  enforceFormValue = false
) => {
  const formStateAttribute = formFields[attribute];
  const fallbackValue = formStateAttribute.isNullable ? null : formStateAttribute.defaultValue;

  const enabledBasedOnSection =
    formStateAttribute.section !== undefined
      ? formSections[formStateAttribute.section].enabled
      : true;

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
            getUpdateValue(dependsOnField, config, formFields, formSections, true)
          );
        }, {})
      : {};

  if (
    formValue === formStateAttribute.defaultValue &&
    formValue === configValue &&
    formStateAttribute.isOptional
  ) {
    return {};
  }

  // If the resettable section the form field belongs to is disabled,
  // the whole section will be set to `null` to do the actual reset.
  if (formStateAttribute.section !== undefined && !enabledBasedOnSection) {
    return setNestedProperty(
      dependsOnConfig,
      formSections[formStateAttribute.section].configFieldName,
      null
    );
  }

  return enabledBasedOnSection && (formValue !== configValue || enforceFormValue)
    ? setNestedProperty(
        dependsOnConfig,
        formStateAttribute.configFieldName,
        formValue === '' && formStateAttribute.isOptional ? undefined : formValue
      )
    : {};
};

// Takes in the form configuration and returns a
// request object suitable to be sent to the
// transform update API endpoint.
export const applyFormStateToTransformConfig = (
  config: TransformConfigUnion,
  formFields: EditTransformFlyoutFieldsState,
  formSections: EditTransformFlyoutSectionsState
): PostTransformsUpdateRequestSchema =>
  // Iterates over all form fields and only if necessary applies them to
  // the request object used for updating the transform.
  (Object.keys(formFields) as EditTransformFormFields[]).reduce(
    (updateConfig, field) =>
      merge({ ...updateConfig }, getUpdateValue(field, config, formFields, formSections)),
    {}
  );

// Takes in a transform configuration and returns
// the default state to populate the form.
export const getDefaultState = (config: TransformConfigUnion): EditTransformFlyoutFormState => ({
  formFields: {
    // top level attributes
    description: initializeFormField('description', 'description', config),
    frequency: initializeFormField('frequency', 'frequency', config, {
      defaultValue: DEFAULT_TRANSFORM_FREQUENCY,
      validator: frequencyValidator,
    }),

    // dest.*
    destinationIndex: initializeFormField('destinationIndex', 'dest.index', config, {
      dependsOn: ['destinationIngestPipeline'],
      isOptional: false,
    }),
    destinationIngestPipeline: initializeFormField(
      'destinationIngestPipeline',
      'dest.pipeline',
      config,
      {
        dependsOn: ['destinationIndex'],
        isOptional: true,
      }
    ),

    // settings.*
    docsPerSecond: initializeFormField('docsPerSecond', 'settings.docs_per_second', config, {
      isNullable: true,
      isOptional: true,
      validator: integerAboveZeroValidator,
      valueParser: nullableNumberParser,
    }),
    maxPageSearchSize: initializeFormField(
      'maxPageSearchSize',
      'settings.max_page_search_size',
      config,
      {
        defaultValue: `${DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE}`,
        isNullable: true,
        isOptional: true,
        validator: transformSettingsPageSearchSizeValidator,
        valueParser: numberParser,
      }
    ),
    numFailureRetries: initializeFormField(
      'numFailureRetries',
      'settings.num_failure_retries',
      config,
      {
        defaultValue: undefined,
        isNullable: true,
        isOptional: true,
        validator: transformSettingsNumberOfRetriesValidator,
        valueParser: numberParser,
      }
    ),

    // retention_policy.*
    retentionPolicyField: initializeFormField(
      'retentionPolicyField',
      'retention_policy.time.field',
      config,
      {
        dependsOn: ['retentionPolicyMaxAge'],
        isNullable: false,
        isOptional: true,
        section: 'retentionPolicy',
      }
    ),
    retentionPolicyMaxAge: initializeFormField(
      'retentionPolicyMaxAge',
      'retention_policy.time.max_age',
      config,
      {
        dependsOn: ['retentionPolicyField'],
        isNullable: false,
        isOptional: true,
        section: 'retentionPolicy',
        validator: retentionPolicyMaxAgeValidator,
      }
    ),
  },
  formSections: {
    retentionPolicy: initializeFormSection('retentionPolicy', 'retention_policy', config),
  },
  isFormTouched: false,
  isFormValid: true,
});

// Checks each form field for error messages to return
// if the overall form is valid or not.
const isFormValid = (fieldsState: EditTransformFlyoutFieldsState) =>
  Object.values(fieldsState).every((d) => d.errorMessages.length === 0);

const getFieldValues = (fields: EditTransformFlyoutFieldsState) =>
  Object.values(fields).map((f) => f.value);
const getSectionValues = (sections: EditTransformFlyoutSectionsState) =>
  Object.values(sections).map((s) => s.enabled);

interface EditTransformFlyoutProviderProps {
  config: TransformConfigUnion;
  dataViewId?: string;
}

interface EditTransformFlyoutFormState {
  apiErrorMessage?: string;
  formFields: EditTransformFlyoutFieldsState;
  formSections: EditTransformFlyoutSectionsState;
  isFormTouched: boolean;
  isFormValid: boolean;
}

const isFormTouched = (config: TransformConfigUnion, currentState: EditTransformFlyoutState) => {
  const defaultState = getDefaultState(config);
  const defaultFieldValues = getFieldValues(defaultState.formFields);
  const defaultSectionValues = getSectionValues(defaultState.formSections);
  return (
    !isEqual(defaultFieldValues, getFieldValues(currentState.formFields)) ||
    !isEqual(defaultSectionValues, getSectionValues(currentState.formSections))
  );
};

// The state we manage via redux combines the provider props and the form state.
export type EditTransformFlyoutState = EditTransformFlyoutProviderProps &
  EditTransformFlyoutFormState;

const editTransformFlyoutSlice = createSlice({
  name: 'editTransformFlyout',
  initialState: undefined as unknown as EditTransformFlyoutState,
  reducers: {
    initialize: (state, action: PayloadAction<EditTransformFlyoutProviderProps>) => {
      const defaultState = getDefaultState(action.payload.config);
      return {
        ...defaultState,
        config: action.payload.config,
        dataViewId: action.payload.dataViewId,
      };
    },
    setApiError: (state, action: PayloadAction<string | undefined>) => {
      state.apiErrorMessage = action.payload;
    },
    // Updates a form field with its new value, runs validation and
    // populates `errorMessages` if any errors occur.
    setFormField: (
      state,
      action: PayloadAction<{ field: EditTransformFormFields; value: string }>
    ) => {
      const formField = state.formFields[action.payload.field];
      formField.errorMessages =
        formField.isOptional &&
        typeof action.payload.value === 'string' &&
        action.payload.value.length === 0
          ? []
          : formField.validator(action.payload.value, formField.isOptional);
      formField.value = action.payload.value;
      state.formFields[action.payload.field] = formField;

      state.isFormTouched = isFormTouched(state.config, state);
      state.isFormValid = isFormValid(state.formFields);
    },
    // Updates a form section.
    setFormSection: (
      state,
      action: PayloadAction<{ section: EditTransformFormSections; enabled: boolean }>
    ) => {
      state.formSections[action.payload.section].enabled = action.payload.enabled;
      state.isFormTouched = isFormTouched(state.config, state);
      state.isFormValid = isFormValid(state.formFields);
    },
  },
});

export const EditTransformFlyoutProvider: FC<
  React.PropsWithChildren<EditTransformFlyoutProviderProps>
> = ({ children, ...props }) => {
  const store = configureStore({
    reducer: editTransformFlyoutSlice.reducer,
  });

  // initialize redux state
  useEffect(() => {
    store.dispatch(editTransformFlyoutSlice.actions.initialize(props));
  }, [props, store]);

  return <Provider store={store}>{children}</Provider>;
};

export function useEditTransformFlyoutActions() {
  const dispatch = useDispatch();
  return bindActionCreators(editTransformFlyoutSlice.actions, dispatch);
}

export function useEditTransformFlyoutState() {
  return useStore<EditTransformFlyoutState>().getState();
}

export function useEditTransformFlyoutSelector<T>(selector: (s: EditTransformFlyoutState) => T) {
  return useSelector<EditTransformFlyoutState, T>(selector);
}
