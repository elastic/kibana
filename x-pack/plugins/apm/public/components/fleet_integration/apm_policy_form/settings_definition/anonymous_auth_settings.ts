/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PackagePolicyVars, SettingDefinition } from '../typings';
import { isSettingsFormValid } from '../settings_form/utils';

export function getAnonymousSettings(): SettingDefinition[] {
  return [];
}

export function isAnonymousAuthFormValid(
  newVars: PackagePolicyVars,
  anonymousAuthSettings: SettingDefinition[]
) {
  return isSettingsFormValid(anonymousAuthSettings, newVars);
}
