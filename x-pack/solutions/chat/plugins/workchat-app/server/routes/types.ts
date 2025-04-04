/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger, CoreSetup } from '@kbn/core/server';
import type { WorkChatAppPluginStartDependencies } from '../types';
import type { InternalServices } from '../services';

export interface RouteDependencies {
  core: CoreSetup<WorkChatAppPluginStartDependencies>;
  router: IRouter;
  logger: Logger;
  getServices: () => InternalServices;
}
