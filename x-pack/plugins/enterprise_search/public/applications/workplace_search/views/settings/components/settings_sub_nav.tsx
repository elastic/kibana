/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRouteMatch } from 'react-router-dom';

import { EuiSideNavItemType } from '@elastic/eui';

import { generateNavLink } from '../../../../shared/layout';
import { NAV } from '../../../constants';
import {
  ORG_SETTINGS_PATH,
  ORG_SETTINGS_CUSTOMIZE_PATH,
  ORG_SETTINGS_CONNECTORS_PATH,
  ORG_SETTINGS_OAUTH_APPLICATION_PATH,
} from '../../../routes';

export const useSettingsSubNav = () => {
  const isSettingsPage = !!useRouteMatch(ORG_SETTINGS_PATH);
  if (!isSettingsPage) return undefined;

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'settingsCustomize',
      name: NAV.SETTINGS_CUSTOMIZE,
      ...generateNavLink({ to: ORG_SETTINGS_CUSTOMIZE_PATH }),
    },
    {
      id: 'settingsConnectors',
      name: NAV.SETTINGS_SOURCE_PRIORITIZATION,
      ...generateNavLink({ to: ORG_SETTINGS_CONNECTORS_PATH, shouldShowActiveForSubroutes: true }),
    },
    {
      id: 'settingsOAuth',
      name: NAV.SETTINGS_OAUTH,
      ...generateNavLink({ to: ORG_SETTINGS_OAUTH_APPLICATION_PATH }),
    },
  ];

  return navItems;
};
