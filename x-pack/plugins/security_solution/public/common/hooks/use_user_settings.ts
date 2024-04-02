/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileData } from '@kbn/security-plugin-types-common';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';
import { APP_ID } from '../../../common';
import { useKibana } from '../lib/kibana';

export interface SecuritySolutionUserSettingPath {
  module: keyof typeof SecuritySolutionUserSettingModules;
  key: string;
}

export type SecuritySolutionUserSetting<T> = Record<
  keyof typeof SecuritySolutionUserSettingModules,
  {
    [key: SecuritySolutionUserSettingPath['key']]: T;
  }
>;

export const SecuritySolutionUserSettingModules = {
  TIMELINE: 'timeline',
  CASE: 'case',
  ALERT: 'alert',
} as const;

export const useSecuritySolutionUserSettings = <T>(
  userSettingPath: SecuritySolutionUserSettingPath
) => {
  const { module, key } = userSettingPath;
  const [userSettingsLoadStatus, setUserSettingsLoadStatus] = useState<
    'pending' | 'success' | 'failure'
  >('pending');

  const [userSettings, setUserSettings] = useState<UserProfileData | null>(null);

  const selectedUserSetting = useMemo(() => {
    return (userSettings?.userSettings?.[APP_ID] as SecuritySolutionUserSetting<T>)?.[module]?.[
      key
    ];
  }, [key, module, userSettings?.userSettings]);

  const userSettingsSubscription = useRef<Subscription>();

  const {
    services: { security },
  } = useKibana();

  const subscribeToUserSettings = useCallback(() => {
    userSettingsSubscription.current = security.userProfiles.userProfile$.subscribe((settings) => {
      setUserSettings(settings);
    });
  }, [security.userProfiles.userProfile$]);

  const unsubscribeFromUserSettings = useCallback(() => {
    if (userSettingsSubscription.current) {
      userSettingsSubscription.current.unsubscribe();
    }
  }, []);

  useEffect(() => {
    subscribeToUserSettings();
    return () => {
      unsubscribeFromUserSettings();
    };
  }, [subscribeToUserSettings, unsubscribeFromUserSettings]);

  const getCurrent = useCallback(async (): Promise<T> => {
    const result = await security.userProfiles.getCurrent({
      dataPath: `userSettings.${APP_ID}.${module}.${key}`,
    });

    return (result.data?.userSettings?.[APP_ID] as SecuritySolutionUserSetting<T>)?.[module]?.[key];
  }, [security.userProfiles, module, key]);

  const createNamespace = useCallback(async () => {
    if (userSettingsLoadStatus === 'pending') return;
    if (userSettings?.userSettings && APP_ID in userSettings?.userSettings) return;
    security.userProfiles.update({
      userSettings: {
        [APP_ID]: {},
      },
    });
  }, [security.userProfiles, userSettings, userSettingsLoadStatus]);

  const update = useCallback(
    async (value: T) => {
      // console.log(`updating UserSettingsSecuritySolution`, { module, key, value });
      await security.userProfiles.update({
        userSettings: {
          [APP_ID]: {
            [module]: {
              [key]: value,
            },
          },
        },
      });
    },
    [security.userProfiles, key, module]
  );

  useEffect(() => {
    (async function () {
      await createNamespace();
      if (userSettingsLoadStatus === 'pending') {
        await getCurrent();
        setUserSettingsLoadStatus('success');
      }
    })();
  }, [createNamespace, getCurrent, userSettingsLoadStatus]);

  return {
    userSettings: selectedUserSetting,
    getCurrent,
    update,
    userSettingsLoadStatus,
  };
};
