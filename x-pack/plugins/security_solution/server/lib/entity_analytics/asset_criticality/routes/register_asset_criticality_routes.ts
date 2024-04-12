/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, StartServicesAccessor } from '@kbn/core/server';
import type { StartPlugins } from '../../../../plugin';
import type { ConfigType } from '../../../../config';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { assetCriticalityStatusRoute } from './status';
import { assetCriticalityUpsertRoute } from './upsert';
import { assetCriticalityGetRoute } from './get';
import { assetCriticalityDeleteRoute } from './delete';
import { assetCriticalityPrivilegesRoute } from './privileges';
import { assetCriticalityCSVUploadRoute } from './upload_csv';

export const registerAssetCriticalityRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  config: ConfigType,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  assetCriticalityStatusRoute(router, logger);
  assetCriticalityUpsertRoute(router, logger);
  assetCriticalityGetRoute(router, logger);
  assetCriticalityDeleteRoute(router, logger);
  assetCriticalityPrivilegesRoute(router, getStartServices, logger);
  assetCriticalityCSVUploadRoute(router, logger, config, getStartServices);
};
