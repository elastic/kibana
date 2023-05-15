/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { NonUndefined } from 'utility-types';
import type { SecuritySolutionUserSettings, UserSettingScope } from './types';

export interface SecuritySolutionUserSettingsContextType {
  settings?: SecuritySolutionUserSettings;
  getUserSetting: <T>(settingScopeId: UserSettingScope, settingId: string) => T | undefined;
  getAllSettings: () => SecuritySolutionUserSettings | undefined;
  setUserSettings: <T extends NonUndefined<unknown>>(
    settingScopeId: UserSettingScope,
    settingId: string,
    setting: T
  ) => void;
}

export const SecuritySolutionUserSettingsContext = createContext<
  SecuritySolutionUserSettingsContextType | undefined
>(undefined);
