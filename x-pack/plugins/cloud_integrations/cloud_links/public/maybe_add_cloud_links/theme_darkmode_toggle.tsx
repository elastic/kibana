/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UpdateUserProfileHook } from '@kbn/security-plugin/public';

interface Props {
  useUpdateUserProfile: UpdateUserProfileHook;
}

export const ThemDarkModeToggle = ({ useUpdateUserProfile }: Props) => {
  const toggleTextSwitchId = useGeneratedHtmlId({ prefix: 'toggleTextSwitch' });
  const { euiTheme } = useEuiTheme();
  const [checked, setChecked] = useState(false);

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

  const { userSettings: { darkMode = 'light' } = { darkMode: undefined } } = userProfileData ?? {};

  const toggleDarkMode = useCallback(
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
    setChecked(darkMode === 'dark');
  }, [darkMode]);

  if (!userProfileData) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="xs">
      <EuiFlexItem>
        <EuiContextMenuItem
          icon={darkMode === 'dark' ? 'moon' : 'sun'}
          size="s"
          onClick={() => {
            const on = darkMode === 'light' ? true : false;
            toggleDarkMode(on);
          }}
          data-test-subj="darkModeToggle"
        >
          {i18n.translate('xpack.cloudLinks.userMenuLinks.darkModeToggle', {
            defaultMessage: 'Dark mode',
          })}
        </EuiContextMenuItem>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ paddingRight: euiTheme.size.m }}>
        <EuiSwitch
          label={
            checked
              ? i18n.translate('xpack.cloudLinks.userMenuLinks.darkModeOnLabel', {
                  defaultMessage: 'on',
                })
              : i18n.translate('xpack.cloudLinks.userMenuLinks.darkModeOffLabel', {
                  defaultMessage: 'off',
                })
          }
          showLabel={false}
          checked={checked}
          onChange={(e) => {
            toggleDarkMode(e.target.checked);
          }}
          aria-describedby={toggleTextSwitchId}
          data-test-subj="darkModeToggleSwitch"
          compressed
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
