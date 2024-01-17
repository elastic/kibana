/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useSelector } from 'react-redux';

import type { State } from '../edit_transform_flyout_state';

import type { FormFields } from '../form_field';

export const selectFormFields = (s: State) => s.formFields;

const createSelectFormField = (field: FormFields) => (s: State) => s.formFields[field];
export const useFormField = (field: FormFields) => {
  const selectFormField = useMemo(() => createSelectFormField(field), [field]);
  return useSelector(selectFormField);
};
