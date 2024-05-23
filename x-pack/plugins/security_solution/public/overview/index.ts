/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  DATA_QUALITY_PATH,
  DETECTION_RESPONSE_PATH,
  ENTITY_ANALYTICS_PATH,
  LANDING_PATH,
  OVERVIEW_PATH,
} from '../../common/constants';
import type { SecuritySubPlugin } from '../app/types';
import { withSubPluginRouteSuspense } from '../common/components/with_sub_plugin_route_suspense';

const loadRoutes = () =>
  import(
    /* webpackChunkName: "sub_plugin_routes-overview" */
    './routes'
  );

const OverviewRoutesLazy = React.lazy(() =>
  loadRoutes().then(({ OverviewRoutes }) => ({ default: OverviewRoutes }))
);
const DetectionResponseRoutesLazy = React.lazy(() =>
  loadRoutes().then(({ DetectionResponseRoutes }) => ({ default: DetectionResponseRoutes }))
);
const LandingRoutesLazy = React.lazy(() =>
  loadRoutes().then(({ LandingRoutes }) => ({ default: LandingRoutes }))
);
const EntityAnalyticsRoutesLazy = React.lazy(() =>
  loadRoutes().then(({ EntityAnalyticsRoutes }) => ({ default: EntityAnalyticsRoutes }))
);
const DataQualityRoutesLazy = React.lazy(() =>
  loadRoutes().then(({ DataQualityRoutes }) => ({ default: DataQualityRoutes }))
);

export class Overview {
  public setup() {}

  public start(): SecuritySubPlugin {
    return {
      routes: [
        {
          path: OVERVIEW_PATH,
          component: withSubPluginRouteSuspense(OverviewRoutesLazy),
        },
        {
          path: DETECTION_RESPONSE_PATH,
          component: withSubPluginRouteSuspense(DetectionResponseRoutesLazy),
        },
        {
          path: LANDING_PATH,
          component: withSubPluginRouteSuspense(LandingRoutesLazy),
        },
        {
          path: ENTITY_ANALYTICS_PATH,
          component: withSubPluginRouteSuspense(EntityAnalyticsRoutesLazy),
        },
        {
          path: DATA_QUALITY_PATH,
          component: withSubPluginRouteSuspense(DataQualityRoutesLazy),
        },
      ],
    };
  }
}
