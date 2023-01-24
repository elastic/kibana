/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { DASHBOARDS_PATH, MANAGE_PATH, EXPLORE_PATH } from '../../common/constants';
import { ExploreLandingPage } from './pages/explore';
import { DashboardsLandingPage } from './pages/dashboards';
import { ManageLandingPage } from './pages/manage';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

export const ThreatHuntingRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.exploreLanding}>
      <ExploreLandingPage />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const DashboardRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.dashboardsLanding}>
      <DashboardsLandingPage />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const ManageRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.administration}>
      <ManageLandingPage />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: EXPLORE_PATH,
    component: ThreatHuntingRoutes,
  },
  {
    path: DASHBOARDS_PATH,
    component: DashboardRoutes,
  },
  {
    path: MANAGE_PATH,
    component: ManageRoutes,
  },
];
