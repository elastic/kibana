/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { SideNavLink } from '../../../../shared/layout';
import { NAV } from '../../../constants';
import {
  ORG_SETTINGS_CUSTOMIZE_PATH,
  ORG_SETTINGS_CONNECTORS_PATH,
  ORG_SETTINGS_OAUTH_APPLICATION_PATH,
} from '../../../routes';

export const SettingsSubNav: React.FC = () => (
  <>
    <SideNavLink to={ORG_SETTINGS_CUSTOMIZE_PATH}>{NAV.SETTINGS_CUSTOMIZE}</SideNavLink>
    <SideNavLink to={ORG_SETTINGS_CONNECTORS_PATH}>
      {NAV.SETTINGS_SOURCE_PRIORITIZATION}
    </SideNavLink>
    <SideNavLink to={ORG_SETTINGS_OAUTH_APPLICATION_PATH}>{NAV.SETTINGS_OAUTH}</SideNavLink>
  </>
);
