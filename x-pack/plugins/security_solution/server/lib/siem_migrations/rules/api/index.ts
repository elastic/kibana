/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { registerSiemRuleMigrationsCreateRoute } from './create';
import { registerSiemRuleMigrationsUpdateRoute } from './update';
import { registerSiemRuleMigrationsGetRoute } from './get';
import { registerSiemRuleMigrationsStartRoute } from './start';
import { registerSiemRuleMigrationsStatsRoute } from './stats';
import { registerSiemRuleMigrationsStopRoute } from './stop';
import { registerSiemRuleMigrationsStatsAllRoute } from './stats_all';
import { registerSiemRuleMigrationsResourceUpsertRoute } from './resources/upsert';
import { registerSiemRuleMigrationsResourceGetRoute } from './resources/get';
import { registerSiemRuleMigrationsRetryRoute } from './retry';
import { registerSiemRuleMigrationsInstallRoute } from './rules/install';
import { registerSiemRuleMigrationsInstallTranslatedRoute } from './rules/install_translated';

export const registerSiemRuleMigrationsRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  registerSiemRuleMigrationsCreateRoute(router, logger);
  registerSiemRuleMigrationsUpdateRoute(router, logger);
  registerSiemRuleMigrationsStatsAllRoute(router, logger);
  registerSiemRuleMigrationsGetRoute(router, logger);
  registerSiemRuleMigrationsStartRoute(router, logger);
  registerSiemRuleMigrationsRetryRoute(router, logger);
  registerSiemRuleMigrationsStatsRoute(router, logger);
  registerSiemRuleMigrationsStopRoute(router, logger);
  registerSiemRuleMigrationsInstallRoute(router, logger);
  registerSiemRuleMigrationsInstallTranslatedRoute(router, logger);

  registerSiemRuleMigrationsResourceUpsertRoute(router, logger);
  registerSiemRuleMigrationsResourceGetRoute(router, logger);
};
