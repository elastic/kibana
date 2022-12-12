/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHistory, useRouteMatch } from 'react-router-dom';
import { EuiPageHeaderProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SYNTHETICS_SETTINGS_ROUTE } from '../../../../../common/constants';

export type SettingsTabId =
  | 'data-retention'
  | 'params'
  | 'alerting'
  | 'private-locations'
  | 'api-keys';

export const getSettingsPageHeader = (
  history: ReturnType<typeof useHistory>,
  syntheticsPath: string
): EuiPageHeaderProps => {
  // Not a component, but it doesn't matter. Hooks are just functions
  const match = useRouteMatch<{ tabId: SettingsTabId }>(SYNTHETICS_SETTINGS_ROUTE); // eslint-disable-line react-hooks/rules-of-hooks

  if (!match) {
    return {};
  }

  const { tabId } = match.params;

  const replaceTab = (newTabId: SettingsTabId) => {
    return `${syntheticsPath}${SYNTHETICS_SETTINGS_ROUTE.replace(':tabId', newTabId)}`;
  };

  return {
    pageTitle: i18n.translate('xpack.synthetics.settingsRoute.pageHeaderTitle', {
      defaultMessage: 'Settings',
    }),
    rightSideItems: [],
    tabs: [
      {
        label: i18n.translate('xpack.synthetics.settingsTabs.alerting', {
          defaultMessage: 'Alerting',
        }),
        isSelected: tabId === 'alerting',
        href: replaceTab('alerting'),
      },
      {
        label: i18n.translate('xpack.synthetics.settingsTabs.privateLocations', {
          defaultMessage: 'Private Locations',
        }),
        isSelected: tabId === 'private-locations',
        href: replaceTab('private-locations'),
      },
      {
        label: i18n.translate('xpack.synthetics.settingsTabs.dataRetention', {
          defaultMessage: 'Data Retention',
        }),
        isSelected: tabId === 'data-retention',
        href: replaceTab('data-retention'),
      },
      {
        label: i18n.translate('xpack.synthetics.settingsTabs.apiKeys', {
          defaultMessage: 'Project API Keys',
        }),
        isSelected: tabId === 'api-keys',
        href: replaceTab('api-keys'),
      },
    ],
  };
};
