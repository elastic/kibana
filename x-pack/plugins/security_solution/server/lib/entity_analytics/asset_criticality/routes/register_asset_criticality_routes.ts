/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { assetCriticalityStatusRoute } from './status';
import { assetCriticalityUpsertRoute } from './upsert';
import { assetCriticalityGetRoute } from './get';
import { assetCriticalityDeleteRoute } from './delete';
import { assetCriticalityPrivilegesRoute } from './privileges';
import { assetCriticalityCSVUploadRoute } from './upload_csv';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const registerAssetCriticalityRoutes = ({
  router,
  logger,
  config,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  assetCriticalityStatusRoute(router, logger);
  assetCriticalityUpsertRoute(router, logger);
  assetCriticalityGetRoute(router, logger);
  assetCriticalityDeleteRoute(router, logger);
  assetCriticalityPrivilegesRoute(router, logger, getStartServices);
  assetCriticalityCSVUploadRoute(router, logger, config, getStartServices);
};
