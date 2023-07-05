/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SecurityPluginStart } from '@kbn/security-plugin/public';

interface Props {
  useUpdateUserProfile: SecurityPluginStart['hooks']['useUpdateUserProfile'];
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
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiButtonEmpty
          className="euiContextMenuItem euiContextMenuItem--small"
          iconType={darkMode === 'dark' ? 'moon' : 'sun'}
          contentProps={{ css: { justifyContent: 'flex-start', fontWeight: 400 } }}
          flush="left"
          color="text"
          onClick={() => {
            updateSetting({
              key: 'darkMode',
              value: darkMode === 'light' ? 'dark' : 'light',
            });
          }}
        >
          {i18n.translate('xpack.cloudLinks.userMenuLinks.darkModeToggle', {
            defaultMessage: 'Dark mode',
          })}
        </EuiButtonEmpty>
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
