/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import {
  OVERVIEW_PATH,
  DATA_QUALITY_PATH,
  DETECTION_RESPONSE_PATH,
  SecurityPageName,
  ENTITY_ANALYTICS_PATH,
} from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';

import { StatefulOverview } from './pages/overview';
import { DataQuality } from './pages/data_quality';
import { DetectionResponse } from './pages/detection_response';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { EntityAnalyticsPage } from '../entity_analytics/pages/entity_analytics_dashboard';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

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

const EntityAnalyticsRoutes = () => (
  <PluginTemplateWrapper>
    <SecurityRoutePageWrapper pageName={SecurityPageName.entityAnalytics}>
      <EntityAnalyticsPage />
    </SecurityRoutePageWrapper>
  </PluginTemplateWrapper>
);

const DataQualityRoutes = () => (
  <PluginTemplateWrapper>
    <SecurityRoutePageWrapper pageName={SecurityPageName.dataQuality}>
      <DataQuality />
    </SecurityRoutePageWrapper>
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
    path: ENTITY_ANALYTICS_PATH,
    render: EntityAnalyticsRoutes,
  },
  {
    path: DATA_QUALITY_PATH,
    component: DataQualityRoutes,
  },
];
