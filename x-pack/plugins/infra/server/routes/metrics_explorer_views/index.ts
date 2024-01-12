/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraBackendLibs } from '../../lib/infra_types';
import { initCreateMetricsExplorerViewRoute } from './create_metrics_explorer_view';
import { initDeleteMetricsExplorerViewRoute } from './delete_metrics_explorer_view';
import { initFindMetricsExplorerViewRoute } from './find_metrics_explorer_view';
import { initGetMetricsExplorerViewRoute } from './get_metrics_explorer_view';
import { initUpdateMetricsExplorerViewRoute } from './update_metrics_explorer_view';

export const initMetricsExplorerViewRoutes = (
  dependencies: Pick<InfraBackendLibs, 'framework' | 'getStartServices'>
) => {
  if (!dependencies.framework.config.featureFlags.metricsExplorerEnabled) {
    return;
  }

  initCreateMetricsExplorerViewRoute(dependencies);
  initDeleteMetricsExplorerViewRoute(dependencies);
  initFindMetricsExplorerViewRoute(dependencies);
  initGetMetricsExplorerViewRoute(dependencies);
  initUpdateMetricsExplorerViewRoute(dependencies);
};
