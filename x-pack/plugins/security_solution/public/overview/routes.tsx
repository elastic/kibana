/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import {
  LANDING_PATH,
  OVERVIEW_PATH,
  DATA_QUALITY_PATH,
  DETECTION_RESPONSE_PATH,
  SecurityPageName,
  ENTITY_ANALYTICS_PATH,
} from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';

import { LandingPage } from './pages/landing';
import { StatefulOverview } from './pages/overview';
import { DataQuality } from './pages/data_quality';
import { DetectionResponse } from './pages/detection_response';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { EntityAnalyticsPage } from './pages/entity_analytics';
import { EntityAnalyticsPageNew } from './pages/entity_analytics_new';

const OverviewRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.overview}>
      <StatefulOverview />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const DetectionResponseRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.detectionAndResponse}>
      <DetectionResponse />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const LandingRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.landing}>
      <LandingPage />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const EntityAnalyticsRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.entityAnalytics}>
      <EntityAnalyticsPage />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const EntityAnalyticsNewRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.entityAnalytics}>
      <EntityAnalyticsPageNew />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const DataQualityRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.dataQuality}>
      <DataQuality />
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
  {
    path: `${ENTITY_ANALYTICS_PATH}_new`,
    render: EntityAnalyticsNewRoutes,
  },
  {
    path: DATA_QUALITY_PATH,
    component: DataQualityRoutes,
  },
];
