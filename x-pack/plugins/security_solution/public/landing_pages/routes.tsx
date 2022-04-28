/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import { SecurityPageName, SecuritySubPluginRoutes } from '../app/types';
import { DASHBOARDS_PATH, THREAT_HUNTING_PATH } from '../../common/constants';
import { ThreatHuntingLandingPage } from './pages/threat_hunting';
import { DashboardsLandingPage } from './pages/dashboards';

export const ThreatHuntingRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.threatHuntingLanding}>
    <ThreatHuntingLandingPage />
  </TrackApplicationView>
);

export const DashboardRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.dashboardsLanding}>
    <DashboardsLandingPage />
  </TrackApplicationView>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: THREAT_HUNTING_PATH,
    render: ThreatHuntingRoutes,
  },
  {
    path: DASHBOARDS_PATH,
    render: DashboardRoutes,
  },
];
