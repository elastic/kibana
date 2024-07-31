/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';
import { SetupRouteOptions } from './types';
import { createEntityDefinitionRoute } from './entities/create';
import { deleteEntityDefinitionRoute } from './entities/delete';
import { resetEntityDefinitionRoute } from './entities/reset';
import { getEntityDefinitionRoute } from './entities/get';
import { checkEntityDiscoveryEnabledRoute } from './enablement/check';
import { enableEntityDiscoveryRoute } from './enablement/enable';
import { disableEntityDiscoveryRoute } from './enablement/disable';

export function setupRoutes<T extends RequestHandlerContext>(dependencies: SetupRouteOptions<T>) {
  createEntityDefinitionRoute<T>(dependencies);
  deleteEntityDefinitionRoute<T>(dependencies);
  resetEntityDefinitionRoute<T>(dependencies);
  getEntityDefinitionRoute<T>(dependencies);
  checkEntityDiscoveryEnabledRoute<T>(dependencies);
  enableEntityDiscoveryRoute<T>(dependencies);
  disableEntityDiscoveryRoute<T>(dependencies);
}
