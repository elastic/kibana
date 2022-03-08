/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '../../../../../src/plugins/usage_collection/public';
import { LANDING_PATH, OVERVIEW_PATH, SecurityPageName } from '../../common/constants';
import { SecuritySubPluginRoutes } from '../app/types';

import { Overview } from './pages';
import { LandingPage } from './pages/landing';

const OverviewRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.overview}>
    <Overview />
  </TrackApplicationView>
);
const LandingRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.landing}>
    <LandingPage />
  </TrackApplicationView>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: OVERVIEW_PATH,
    render: OverviewRoutes,
  },
  {
    path: LANDING_PATH,
    render: LandingRoutes,
  },
];
