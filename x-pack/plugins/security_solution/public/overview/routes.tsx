/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import {
  LANDING_PATH,
  OVERVIEW_PATH,
  DETECTION_RESPONSE_PATH,
  SecurityPageName,
  ENTITY_ANALYTICS_PATH,
} from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';

import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

const StatefulOverviewLazy: React.FC = lazy(() => import('./pages/overview'));
const DetectionResponseLazy: React.FC = lazy(() => import('./pages/detection_response'));
const LandingPageLazy: React.FC = lazy(() => import('./pages/landing'));
const EntityAnalyticsPageLazy: React.FC = lazy(() => import('./pages/entity_analytics'));

const OverviewRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.overview}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <StatefulOverviewLazy />
      </Suspense>
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const DetectionResponseRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.detectionAndResponse}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <DetectionResponseLazy />
      </Suspense>
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const LandingRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.landing}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LandingPageLazy />
      </Suspense>
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const EntityAnalyticsRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.entityAnalytics}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <EntityAnalyticsPageLazy />
      </Suspense>
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: OVERVIEW_PATH,
    component: OverviewRoutes,
  },
  {
    path: DETECTION_RESPONSE_PATH,
    component: DetectionResponseRoutes,
  },
  {
    path: LANDING_PATH,
    render: LandingRoutes,
  },
  {
    path: ENTITY_ANALYTICS_PATH,
    render: EntityAnalyticsRoutes,
  },
];
