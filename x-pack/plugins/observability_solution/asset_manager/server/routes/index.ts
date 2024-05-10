/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { SetupRouteOptions } from './types';
import { pingRoute } from './ping';
import { sampleAssetsRoutes } from './sample_assets';
import { assetsRoutes } from './assets';
import { hostsRoutes } from './assets/hosts';
import { servicesRoutes } from './assets/services';
import { containersRoutes } from './assets/containers';
import { podsRoutes } from './assets/pods';
import { createOAMDefinitionRoute } from './oam/create';
import { deleteOAMDefinitionRoute } from './oam/delete';
import { resetOAMDefinitionRoute } from './oam/reset';

export function setupRoutes<T extends RequestHandlerContext>({
  router,
  assetClient,
  logger,
}: SetupRouteOptions<T>) {
  pingRoute<T>({ router, assetClient, logger });
  sampleAssetsRoutes<T>({ router, assetClient, logger });
  assetsRoutes<T>({ router, assetClient, logger });
  hostsRoutes<T>({ router, assetClient, logger });
  servicesRoutes<T>({ router, assetClient, logger });
  containersRoutes<T>({ router, assetClient, logger });
  podsRoutes<T>({ router, assetClient, logger });
  createOAMDefinitionRoute<T>({ router, assetClient, logger });
  deleteOAMDefinitionRoute<T>({ router, assetClient, logger });
  resetOAMDefinitionRoute<T>({ router, assetClient, logger });
}
