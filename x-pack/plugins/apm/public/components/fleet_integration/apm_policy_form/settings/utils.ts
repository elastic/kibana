/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isEmpty } from 'lodash';
import { PackagePolicyVars } from '../typings';
import { SettingDefinition } from './typings';

export const REQUIRED_LABEL = i18n.translate(
  'xpack.apm.fleet_integration.settings.requiredLabel',
  { defaultMessage: 'Required' }
);
export const OPTIONAL_LABEL = i18n.translate(
  'xpack.apm.fleet_integration.settings.optionalLabel',
  { defaultMessage: 'Optional' }
);
const REQUIRED_FIELD = i18n.translate(
  'xpack.apm.fleet_integration.settings.requiredFieldLabel',
  { defaultMessage: 'Required field' }
);

export function mergeNewVars(
  oldVars: PackagePolicyVars,
  key: string,
  value?: any
): PackagePolicyVars {
  return { ...oldVars, [key]: { ...oldVars[key], value } };
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
      message: setting.required ? REQUIRED_FIELD : '',
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

export function getFlattenedSettings(apmSettings: SettingDefinition[]) {
  function getSettings(settings: SettingDefinition[]): SettingDefinition[] {
    return settings
      .map((setting) => {
        return [
          setting,
          ...(setting.settings ? getSettings(setting.settings) : []),
        ];
      })
      .flat();
  }
  return getSettings(apmSettings);
}
