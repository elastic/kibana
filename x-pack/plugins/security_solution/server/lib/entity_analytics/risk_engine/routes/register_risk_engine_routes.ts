/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StartServicesAccessor, Logger } from '@kbn/core/server';
import type { StartPlugins } from '../../../../plugin_contract';
import type { ConfigType } from '../../../../config';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { riskEngineInitRoute } from './init';
import { riskEngineEnableRoute } from './enable';
import { riskEngineDisableRoute } from './disable';
import { riskEngineStatusRoute } from './status';
import { riskEnginePrivilegesRoute } from './privileges';
import { riskEngineSettingsRoute } from './settings';

export const registerRiskEngineRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  config: ConfigType,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  if (config.experimentalFeatures.riskScoringRoutesEnabled) {
    riskEngineStatusRoute(router);
    riskEngineInitRoute(router, getStartServices);
    riskEngineEnableRoute(router, getStartServices);
    riskEngineDisableRoute(router, getStartServices);
    riskEngineSettingsRoute(router);
    if (config.experimentalFeatures.riskEnginePrivilegesRouteEnabled) {
      riskEnginePrivilegesRoute(router, getStartServices);
    }
  }
};
