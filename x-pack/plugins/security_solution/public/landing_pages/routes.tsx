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

export const ThreatHuntingRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.exploreLanding}>
    <ExploreLandingPage />
  </TrackApplicationView>
);

export const DashboardRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.dashboardsLanding}>
    <DashboardsLandingPage />
  </TrackApplicationView>
);

export const ManageRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.administration}>
    <ManageLandingPage />
  </TrackApplicationView>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: EXPLORE_PATH,
    render: ThreatHuntingRoutes,
  },
  {
    path: DASHBOARDS_PATH,
    render: DashboardRoutes,
  },
  {
    path: MANAGE_PATH,
    render: ManageRoutes,
  },
];
