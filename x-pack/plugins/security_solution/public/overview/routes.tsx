/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  LANDING_PATH,
  OVERVIEW_PATH,
  DATA_QUALITY_PATH,
  DETECTION_RESPONSE_PATH,
  ENTITY_ANALYTICS_PATH,
  COVERAGE_OVERVIEW_PATH,
} from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';

const OverviewRoutesLazy = React.lazy(() => import('./routes/overview'));

const DetectionResponseRoutesLazy = React.lazy(() => import('./routes/detection_response'));

const LandingRoutesLazy = React.lazy(() => import('./routes/landing'));

const EntityAnalyticsRoutesLazy = React.lazy(() => import('./routes/entity_analytics'));

const DataQualityRoutesLazy = React.lazy(() => import('./routes/data_quality'));

const CoverageOverviewRoutesLazy = React.lazy(() => import('./routes/coverage_overview'));

export const routes: SecuritySubPluginRoutes = [
  {
    path: OVERVIEW_PATH,
    component: OverviewRoutesLazy,
  },
  {
    path: DETECTION_RESPONSE_PATH,
    component: DetectionResponseRoutesLazy,
  },
  {
    path: LANDING_PATH,
    render: LandingRoutesLazy,
  },
  {
    path: ENTITY_ANALYTICS_PATH,
    render: EntityAnalyticsRoutesLazy,
  },
  {
    path: DATA_QUALITY_PATH,
    component: DataQualityRoutesLazy,
  },
  {
    path: COVERAGE_OVERVIEW_PATH,
    component: CoverageOverviewRoutesLazy,
  },
];
