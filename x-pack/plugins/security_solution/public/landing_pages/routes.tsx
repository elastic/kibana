/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import { EuiLoadingSpinner } from '@elastic/eui';
import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { DASHBOARDS_PATH, MANAGE_PATH, EXPLORE_PATH } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

const ExploreLandingPageLazy: React.FC = lazy(() => import('./pages/explore'));
const DashboardsLandingPageLazy: React.FC = lazy(() => import('./pages/dashboards'));
const ManageLandingPageLazy: React.FC = lazy(() => import('./pages/manage'));

export const ThreatHuntingRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.exploreLanding}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <ExploreLandingPageLazy />
      </Suspense>
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const DashboardRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.dashboardsLanding}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <DashboardsLandingPageLazy />
      </Suspense>
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const ManageRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.administration}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <ManageLandingPageLazy />
      </Suspense>
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
