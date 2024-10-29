/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsRoutesDeps } from '../../types';
import { applyDataViewIndicesEntityEngineRoute } from './apply_dataview_indices';
import { deleteEntityEngineRoute } from './delete';
import { listEntitiesRoute } from './entities/list';
import { getEntityEngineRoute } from './get';
import { initEntityEngineRoute } from './init';
import { listEntityEnginesRoute } from './list';
import { startEntityEngineRoute } from './start';
import { stopEntityEngineRoute } from './stop';

export const registerEntityStoreRoutes = ({
  router,
  logger,
  getStartServices,
  config,
}: EntityAnalyticsRoutesDeps) => {
  initEntityEngineRoute(router, logger, config);
  startEntityEngineRoute(router, logger);
  stopEntityEngineRoute(router, logger);
  deleteEntityEngineRoute(router, logger, getStartServices);
  getEntityEngineRoute(router, logger);
  listEntityEnginesRoute(router, logger);
  listEntitiesRoute(router, logger);
  applyDataViewIndicesEntityEngineRoute(router, logger);
};
