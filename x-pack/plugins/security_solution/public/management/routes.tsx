/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { MANAGEMENT_PATH, MANAGE_PATH } from '../../common/constants';
import { SecurityPageName } from '../app/types';
import { ManagementContainer } from './pages';
import type { SecuritySubPluginRoutes } from '../app/types';
import { CurrentLicense } from '../common/components/current_license';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { ManageLandingPage } from './pages/landing';

const ManagementLanding = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.administration}>
      <ManageLandingPage />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

/**
 * Returns the React Router Routes for the management area
 */
const ManagementRoutes = () => (
  <PluginTemplateWrapper>
    <CurrentLicense>
      <ManagementContainer />
    </CurrentLicense>
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: MANAGE_PATH,
    component: React.memo(ManagementLanding),
  },
  {
    path: MANAGEMENT_PATH,
    component: React.memo(ManagementRoutes),
  },
];
