/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';

import type { FormFields } from './form_field';
import type { FormSections } from './form_section';
import type { ProviderProps, State } from './edit_transform_flyout_state';
import { getDefaultState } from './get_default_state';
import { validators, type ValidatorName } from './validators';

function isFormFieldOptional(state: State, field: FormFields) {
  const formField = state.formFields[field];

  let isOptional = formField.isOptional;
  if (formField.section) {
    const section = state.formSections[formField.section];
    if (section.enabled && formField.isOptionalInSection === false) {
      isOptional = false;
    }
  }

  return isOptional;
}

function getFormFieldErrorMessages(
  value: string,
  isOptional: boolean,
  validatorName: ValidatorName
) {
  return isOptional && typeof value === 'string' && value.length === 0
    ? []
    : validators[validatorName](value, isOptional);
}

export const initialize = (_: State, action: PayloadAction<ProviderProps>) =>
  getDefaultState(action.payload.config);

export const setApiError = (state: State, action: PayloadAction<string | undefined>) => {
  state.apiErrorMessage = action.payload;
};

export const setFormField = (
  state: State,
  action: PayloadAction<{ field: FormFields; value: string }>
) => {
  const formField = state.formFields[action.payload.field];
  const isOptional = isFormFieldOptional(state, action.payload.field);

  formField.errorMessages = getFormFieldErrorMessages(
    action.payload.value,
    isOptional,
    formField.validator
  );

  formField.value = action.payload.value;
};

export const setFormSection = (
  state: State,
  action: PayloadAction<{ section: FormSections; enabled: boolean }>
) => {
  state.formSections[action.payload.section].enabled = action.payload.enabled;

  // After a section change we re-evaluate all form fields, since optionality
  // of a field could change if a section got toggled.
  Object.entries(state.formFields).forEach(([formFieldName, formField]) => {
    const isOptional = isFormFieldOptional(state, formFieldName as FormFields);
    formField.errorMessages = getFormFieldErrorMessages(
      formField.value,
      isOptional,
      formField.validator
    );
  });
};
