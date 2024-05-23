/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { SecurityPageName } from '../../common/constants';

import { StatefulOverview } from './pages/overview';
import { DataQuality } from './pages/data_quality';
import { DetectionResponse } from './pages/detection_response';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { EntityAnalyticsPage } from '../entity_analytics/pages/entity_analytics_dashboard';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { LandingPage } from './pages/landing';

export const OverviewRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.overview}>
      <StatefulOverview />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const DetectionResponseRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.detectionAndResponse}>
      <DetectionResponse />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const LandingRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.landing}>
      <LandingPage />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const EntityAnalyticsRoutes = () => (
  <PluginTemplateWrapper>
    <SecurityRoutePageWrapper pageName={SecurityPageName.entityAnalytics}>
      <EntityAnalyticsPage />
    </SecurityRoutePageWrapper>
  </PluginTemplateWrapper>
);

export const DataQualityRoutes = () => (
  <PluginTemplateWrapper>
    <SecurityRoutePageWrapper pageName={SecurityPageName.dataQuality}>
      <DataQuality />
    </SecurityRoutePageWrapper>
  </PluginTemplateWrapper>
);
