/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { StartPlugins } from '../../../plugin';

export interface RegisterUserProfileSettingsRoutesParams {
  router: SecuritySolutionPluginRouter;
  logger: Logger;
  getStartServices: StartServicesAccessor<StartPlugins>;
}
