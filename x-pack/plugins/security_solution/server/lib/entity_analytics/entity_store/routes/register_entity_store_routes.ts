/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsRoutesDeps } from '../../types';
import { deleteEntityEngineRoute } from './delete';
import { getEntityEngineRoute } from './get';
import { initEntityEngineRoute } from './init';
import { listEntityEnginesRoute } from './list';
import { startEntityEngineRoute } from './start';
import { stopEntityEngineRoute } from './stop';

export const registerEntityStoreRoutes = ({ router, logger }: EntityAnalyticsRoutesDeps) => {
  initEntityEngineRoute(router, logger);
  startEntityEngineRoute(router, logger);
  stopEntityEngineRoute(router, logger);
  deleteEntityEngineRoute(router, logger);
  getEntityEngineRoute(router, logger);
  listEntityEnginesRoute(router, logger);
};
