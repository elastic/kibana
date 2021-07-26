/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isEmpty } from 'lodash';
import { PackagePolicyVars } from '../typings';
import { SettingDefinition } from './types';

export const REQUIRED_LABEL = 'Required';
export const OPTIONAL_LABEL = 'Optional';

function mergeNewVars(
  oldVars: PackagePolicyVars,
  key: string,
  value?: any
): PackagePolicyVars {
  return { ...oldVars, [key]: { ...oldVars[key], value } };
}

export function handleFormChange({
  vars,
  key,
  value,
  validateForm,
}: {
  vars: PackagePolicyVars;
  key: string;
  value?: any;
  validateForm: (vars: PackagePolicyVars) => boolean;
}) {
  const newVars = mergeNewVars(vars, key, value);
  const isValid = validateForm(newVars);
  return { newVars, isValid };
}

export function isSettingsFormValid(
  settings: SettingDefinition[],
  vars: PackagePolicyVars
) {
  return settings
    .filter((field) => field.required || field.validation)
    .every((field) => {
      const { value } = vars[field.key];
      return validateSettingValue(field, value).isValid;
    });
}

export function validateSettingValue(setting: SettingDefinition, value?: any) {
  if (isEmpty(value)) {
    return {
      isValid: !setting.required,
      message: setting.required ? 'Required field' : '',
    };
  }

  if (setting.validation) {
    const result = setting.validation.decode(String(value));
    const message = PathReporter.report(result)[0];
    const isValid = isRight(result);
    return { isValid, message };
  }
  return { isValid: true, message: '' };
}
