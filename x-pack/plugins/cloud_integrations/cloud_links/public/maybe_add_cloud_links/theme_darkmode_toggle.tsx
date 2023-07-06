/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
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

  const { userProfileData, isLoading, updateSetting } = useUpdateUserProfile({
    notificationSuccess: {
      title: 'Color theme updated',
      pageReloadText: 'Reload the page to see the changes',
    },
  });

  const { userSettings: { darkMode = 'light' } = { darkMode: undefined } } = userProfileData ?? {};

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
            if (isLoading) {
              return;
            }
            updateSetting({
              key: 'darkMode',
              value: darkMode === 'light' ? 'dark' : 'light',
            });
          }}
        >
          {i18n.translate('xpack.cloudLinks.userMenuLinks.darkModeToggle', {
            defaultMessage: 'Dark mode',
          })}
        </EuiContextMenuItem>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ paddingRight: euiTheme.size.m }}>
        <EuiSwitch
          label={checked ? 'on' : 'off'}
          checked={checked}
          onChange={(e) => {
            const on = e.target.checked;
            updateSetting({
              key: 'darkMode',
              value: on ? 'dark' : 'light',
            });
          }}
          aria-describedby={toggleTextSwitchId}
          disabled={isLoading}
          compressed
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
