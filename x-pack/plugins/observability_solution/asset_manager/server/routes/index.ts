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
import { getEntityDefinitionRoute } from './entities/get';
import { checkEntityDiscoveryKeyRoute } from './enablement/check';
import { enableEntityDiscoveryKeyRoute } from './enablement/enable';
import { disableEntityDiscoveryKeyRoute } from './enablement/disable';
import { installBuiltinEntityDefinitionsRoute } from './enablement/install_builtin_definitions';
import { uninstallBuiltinEntityDefinitionsRoute } from './enablement/uninstall_builtin_definitions';
import { checkEntityDiscoveryEnabledRoute } from './entity_discovery/check';
import { enableEntityDiscoveryRoute } from './entity_discovery/start';
import { disableEntityDiscoveryRoute } from './entity_discovery/stop';

export function setupRoutes<T extends RequestHandlerContext>(dependencies: SetupRouteOptions<T>) {
  pingRoute<T>(dependencies);
  sampleAssetsRoutes<T>(dependencies);
  assetsRoutes<T>(dependencies);
  hostsRoutes<T>(dependencies);
  servicesRoutes<T>(dependencies);
  containersRoutes<T>(dependencies);
  podsRoutes<T>(dependencies);
  createEntityDefinitionRoute<T>(dependencies);
  deleteEntityDefinitionRoute<T>(dependencies);
  resetEntityDefinitionRoute<T>(dependencies);
  getEntityDefinitionRoute<T>(dependencies);
  checkEntityDiscoveryKeyRoute<T>(dependencies);
  enableEntityDiscoveryKeyRoute<T>(dependencies);
  disableEntityDiscoveryKeyRoute<T>(dependencies);
  checkEntityDiscoveryEnabledRoute<T>(dependencies);
  enableEntityDiscoveryRoute<T>(dependencies);
  disableEntityDiscoveryRoute<T>(dependencies);
  installBuiltinEntityDefinitionsRoute<T>(dependencies);
  uninstallBuiltinEntityDefinitionsRoute<T>(dependencies);
}
