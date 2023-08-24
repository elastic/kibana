/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { useUpdateUserProfile } from '@kbn/user-profile-components';

interface Deps {
  uiSettingsClient: IUiSettingsClient;
}

export const useThemeDarkmodeToggle = ({ uiSettingsClient }: Deps) => {
  const [isDarkModeOn, setIsDarkModeOn] = useState(false);
  // If a value is set in kibana.yml (uiSettings.overrides.theme:darkMode)
  // we don't allow the user to change the theme color.
  const valueSetInKibanaConfig = uiSettingsClient.isOverridden('theme:darkMode');

  const { userProfileData, isLoading, update } = useUpdateUserProfile({
    notificationSuccess: {
      title: i18n.translate('xpack.cloudLinks.userMenuLinks.darkMode.successNotificationTitle', {
        defaultMessage: 'Color theme updated',
      }),
      pageReloadText: i18n.translate(
        'xpack.cloudLinks.userMenuLinks.darkMode.successNotificationText',
        {
          defaultMessage: 'Reload the page to see the changes',
        }
      ),
    },
    pageReloadChecker: (prev, next) => {
      return prev?.userSettings?.darkMode !== next.userSettings?.darkMode;
    },
  });

  const { userSettings: { darkMode: colorScheme } = { darkMode: undefined } } =
    userProfileData ?? {};

  const toggle = useCallback(
    (on: boolean) => {
      if (isLoading) {
        return;
      }
      update({
        userSettings: {
          darkMode: on ? 'dark' : 'light',
        },
      });
    },
    [isLoading, update]
  );

  useEffect(() => {
    let updatedValue = false;

    if (typeof colorScheme !== 'string') {
      // User profile does not have yet any preference -> default to space dark mode value
      updatedValue = uiSettingsClient.get('theme:darkMode') ?? false;
    } else {
      updatedValue = colorScheme === 'dark';
    }

    setIsDarkModeOn(updatedValue);
  }, [colorScheme, uiSettingsClient]);

  return {
    isVisible: valueSetInKibanaConfig ? false : Boolean(userProfileData),
    toggle,
    isDarkModeOn,
    colorScheme,
  };
};
