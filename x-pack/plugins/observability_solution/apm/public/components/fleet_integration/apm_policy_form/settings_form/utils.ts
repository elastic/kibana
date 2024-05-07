/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isEmpty, isFinite } from 'lodash';
import { PackagePolicyVars, SettingsRow, BasicSettingRow } from '../typings';

export const REQUIRED_LABEL = i18n.translate('xpack.apm.fleet_integration.settings.requiredLabel', {
  defaultMessage: 'Required',
});
export const OPTIONAL_LABEL = i18n.translate('xpack.apm.fleet_integration.settings.optionalLabel', {
  defaultMessage: 'Optional',
});
const REQUIRED_FIELD = i18n.translate('xpack.apm.fleet_integration.settings.requiredFieldLabel', {
  defaultMessage: 'Required field',
});

export function mergeNewVars(
  oldVars: PackagePolicyVars,
  key: string,
  value?: any
): PackagePolicyVars {
  return { ...oldVars, [key]: { ...oldVars[key], value } };
}

export function isSettingsFormValid(parentSettings: SettingsRow[], vars: PackagePolicyVars) {
  function isSettingsValid(settings: SettingsRow[]): boolean {
    return !settings
      .map((setting) => {
        if (setting.type === 'advanced_setting') {
          return isSettingsValid(setting.settings);
        }

        if (setting.settings) {
          return isSettingsValid(setting.settings);
        }
        const { isValid } = validateSettingValue(setting, vars[setting.key]?.value);
        return isValid;
      })
      .flat()
      .some((isValid) => !isValid);
  }
  return isSettingsValid(parentSettings);
}

export function validateSettingValue(setting: BasicSettingRow, value?: any) {
  if (!isFinite(value) && isEmpty(value)) {
    return {
      isValid: !setting.required,
      message: REQUIRED_FIELD,
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
