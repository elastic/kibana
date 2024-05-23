/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SecuritySubPlugin } from '../app/types';
import {
  ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH,
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
} from '../../common/constants';
import { withSubPluginRouteSuspense } from '../common/components/with_sub_plugin_route_suspense';

const loadRoutes = () =>
  import(
    /* webpackChunkName: "sub_plugin-entity_analytics" */
    './routes'
  );

const EntityAnalyticsManagementLazy = React.lazy(() =>
  loadRoutes().then(({ EntityAnalyticsManagement }) => ({ default: EntityAnalyticsManagement }))
);
const EntityAnalyticsAssetClassificationLazy = React.lazy(() =>
  loadRoutes().then(({ EntityAnalyticsAssetClassification }) => ({
    default: EntityAnalyticsAssetClassification,
  }))
);

export class EntityAnalytics {
  public setup() {}

  public start(isEnabled = false): SecuritySubPlugin {
    return {
      routes: isEnabled
        ? [
            {
              path: ENTITY_ANALYTICS_MANAGEMENT_PATH,
              component: withSubPluginRouteSuspense(EntityAnalyticsManagementLazy),
            },
            {
              path: ENTITY_ANALYTICS_ASSET_CRITICALITY_PATH,
              component: withSubPluginRouteSuspense(EntityAnalyticsAssetClassificationLazy),
            },
          ]
        : [],
    };
  }
}
