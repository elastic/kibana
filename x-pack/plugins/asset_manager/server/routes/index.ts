/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { SetupRouteOptions } from './types';
import { pingRoute } from './ping';
import { assetsRoutes } from './assets';
import { sampleAssetsRoutes } from './sample_assets';
import { hostsRoutes } from './assets/hosts';
import { servicesRoutes } from './assets/services';

export function setupRoutes<T extends RequestHandlerContext>({
  router,
  assetClient,
}: SetupRouteOptions<T>) {
  pingRoute<T>({ router, assetClient });
  assetsRoutes<T>({ router, assetClient });
  sampleAssetsRoutes<T>({ router, assetClient });
  hostsRoutes<T>({ router, assetClient });
  servicesRoutes<T>({ router, assetClient });
}
