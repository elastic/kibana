/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { FC, PropsWithChildren } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { isEqual } from 'lodash';
import { SecuritySolutionUserSettingsContext } from './context';
import type { SecuritySolutionUserSettings, UserSettingScope } from './types';

type SecuritySoutionUserSettingsProviderProps = Record<string, unknown>;

const storage = new Storage(localStorage);

const SECURITY_SOLUTION_USER_SETTINGS_STORAGE_KEY = 'ss-us';

const getData = async (): Promise<SecuritySolutionUserSettings> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(storage.get(SECURITY_SOLUTION_USER_SETTINGS_STORAGE_KEY)), 500);
  });
};

const defaultSettings: SecuritySolutionUserSettings = {} as SecuritySolutionUserSettings;

export const SecuritySoutionUserSettingsProvider: FC<
  PropsWithChildren<SecuritySoutionUserSettingsProviderProps>
> = (props) => {
  const [loading, setLoading] = useState(true);

  const [userSettings, setUserSettings] = useState<SecuritySolutionUserSettings>(
    () => storage.get(SECURITY_SOLUTION_USER_SETTINGS_STORAGE_KEY) ?? defaultSettings
  );

  useEffect(() => {
    getData()
      .then((result) => setUserSettings({ ...(result ?? {}), ...defaultSettings }))
      .finally(() => setLoading(false));
  }, [setUserSettings]);

  useEffect(() => {
    storage.set(SECURITY_SOLUTION_USER_SETTINGS_STORAGE_KEY, userSettings);
  }, [userSettings]);

  const saveUserSettings = useCallback(
    <T = unknown,>(userSettingScopeId: UserSettingScope, settingId: string, setting: T) => {
      setUserSettings((prev) => {
        const newSetting = {
          ...prev,
          [userSettingScopeId]: {
            ...(prev?.[userSettingScopeId] ?? {}),
            [settingId]: setting,
          },
        };
        if (!isEqual(prev, newSetting)) return newSetting;
        return prev;
      });
    },
    []
  );

  const getUserSetting = useCallback(
    <T = unknown,>(settingScopeId: UserSettingScope, settingId: string): T | undefined => {
      const tempSettings = { ...userSettings, ...defaultSettings };

      const settingScope = tempSettings[settingScopeId];

      if (!settingScope) return undefined;

      return settingScope[settingId] as T;
    },
    [userSettings]
  );

  const getAllSettings = useCallback(() => userSettings, [userSettings]);
  if (loading) {
    return <p>{'loading'}</p>;
  }

  return (
    <SecuritySolutionUserSettingsContext.Provider
      value={{
        getUserSetting,
        getAllSettings,
        setUserSettings: saveUserSettings,
      }}
    >
      {props.children}
    </SecuritySolutionUserSettingsContext.Provider>
  );
};
