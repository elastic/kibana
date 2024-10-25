/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { registerSiemRuleMigrationsCreateRoute } from './create';
import { registerSiemRuleMigrationsStartRoute } from './start';
import { registerSiemRuleMigrationsStatsRoute } from './stats';
import { registerSiemRuleMigrationsCancelRoute } from './cancel';

export const registerSiemRuleMigrationsRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  registerSiemRuleMigrationsCreateRoute(router, logger);
  registerSiemRuleMigrationsStartRoute(router, logger);
  registerSiemRuleMigrationsStatsRoute(router, logger);
  registerSiemRuleMigrationsCancelRoute(router, logger);
};
