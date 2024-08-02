/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaFramework } from '../lib/adapters/framework/kibana_framework_adapter';
import { initMetricIndicesRoute } from './metric_indices';
import { initMetricExplorerRoute } from './metrics_explorer';
import { MetricsDataAccessRouter } from './types';

export const registerRoutes = ({
  framework,
  router,
}: {
  framework: KibanaFramework;
  router: MetricsDataAccessRouter;
}) => {
  initMetricExplorerRoute(framework);
  initMetricIndicesRoute({
    router,
  });
};
