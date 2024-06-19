/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter, Logger } from '@kbn/core/server';
import { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import { registerPodsRoute } from './pods';
import { registerDeploymentsRoute } from './deployments';
import { registerDaemonsetsRoute } from './daemonsets';
import { registerPodsCpuRoute } from './pods_cpu';
import { registerPodsMemoryRoute } from './pods_memory';
import { registerDeploymentsCpuRoute } from './deployments_cpu';
import { registerDeploymentsMemoryRoute } from './deployments_memory';
import { registerDaemonsetsCpuRoute } from './daemonsets_cpu';
import { registerDaemonsetsMemoryRoute } from './daemonsets_memory';
import { registerEventsRoute } from './events';
import { registerNodesCpuRoute } from './nodes_cpu';
import { registerNodesMemoryRoute } from './nodes_memory';
import { registerOpenaiRoute } from './openai';


export const registerRoutes = (
  router: IRouter,
  logger: Logger,
  ruleRegistry: RuleRegistryPluginStartContract
) => {
  registerPodsRoute(router, logger);
  registerDeploymentsRoute(router, logger);
  registerDaemonsetsRoute(router, logger);
  registerPodsCpuRoute(router, logger);
  registerPodsMemoryRoute(router, logger);
  registerDeploymentsCpuRoute(router, logger)
  registerDeploymentsMemoryRoute(router, logger)
  registerDaemonsetsCpuRoute(router, logger)
  registerDaemonsetsMemoryRoute(router, logger)
  registerEventsRoute(router, logger);
  registerNodesCpuRoute(router, logger);
  registerNodesMemoryRoute(router, logger);
  registerOpenaiRoute(router, logger);
};
