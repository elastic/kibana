/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileData } from '@kbn/security-plugin-types-common';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';
import { APP_ID } from '../../../common';
import { useKibana } from '../lib/kibana';

export const useSecuritySolutionUserSettings = () => {
  const [userSettings, setUserSettings] = useState<UserProfileData | null>(null);

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

  const getCurrent = useCallback(async () => {
    const result = await security.userProfiles.getCurrent({ dataPath: `userSettings.${APP_ID}` });
    console.log({ currentUserSettingsSecuritySolution: result });
  }, [security.userProfiles]);

  const update = useCallback(
    async (module: string, key: string, value: object) => {
      console.log(`updating UserSettingsSecuritySolution`, { module, key, value });
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
    [security.userProfiles]
  );
  useEffect(() => {
    getCurrent().then(() => {
      update('alert', 'pageControls', { new_key: 'value' });
    });
  }, [getCurrent, update]);

  useEffect(() => {
    subscribeToUserSettings();
    return () => {
      unsubscribeFromUserSettings();
    };
  }, [subscribeToUserSettings, unsubscribeFromUserSettings]);

  return {
    userSettings: userSettings?.userSettings?.[APP_ID] as unknown,
    getCurrent,
    update,
  };
};
