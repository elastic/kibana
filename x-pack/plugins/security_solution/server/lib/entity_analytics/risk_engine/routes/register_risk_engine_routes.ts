/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { riskEngineInitRoute } from './init';
import { riskEngineEnableRoute } from './enable';
import { riskEngineDisableRoute } from './disable';
import { riskEngineStatusRoute } from './status';
import { riskEnginePrivilegesRoute } from './privileges';
import { riskEngineSettingsRoute } from './settings';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const registerRiskEngineRoutes = ({
  router,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  riskEngineStatusRoute(router);
  riskEngineInitRoute(router, getStartServices);
  riskEngineEnableRoute(router, getStartServices);
  riskEngineDisableRoute(router, getStartServices);
  riskEngineSettingsRoute(router);
  riskEnginePrivilegesRoute(router, getStartServices);
};
