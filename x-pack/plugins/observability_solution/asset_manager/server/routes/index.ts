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
import { createEntityDefinitionRoute } from './entities/create';
import { deleteEntityDefinitionRoute } from './entities/delete';
import { resetEntityDefinitionRoute } from './entities/reset';
import { checkEntityDiscoveryEnabledRoute } from './enablement/check';
import { enableEntityDiscoveryRoute } from './enablement/enable';
import { disableEntityDiscoveryRoute } from './enablement/disable';

export function setupRoutes<T extends RequestHandlerContext>({
  router,
  server, 
}: SetupRouteOptions<T>) {
  pingRoute<T>({ router, server });
  sampleAssetsRoutes<T>({ router, server });
  assetsRoutes<T>({ router, server });
  hostsRoutes<T>({ router, server });
  servicesRoutes<T>({ router, server });
  containersRoutes<T>({ router, server });
  podsRoutes<T>({ router, server });
  createEntityDefinitionRoute<T>({ router, server });
  deleteEntityDefinitionRoute<T>({ router, server });
  resetEntityDefinitionRoute<T>({ router, server });
  enableEntityDiscoveryRoute<T>({ router, server });
  disableEntityDiscoveryRoute<T>({ router, server });
  checkEntityDiscoveryEnabledRoute<T>({ router, server });
}
