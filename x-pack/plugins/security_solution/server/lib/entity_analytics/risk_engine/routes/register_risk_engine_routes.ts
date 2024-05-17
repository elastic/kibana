import type { EntityAnalyticsRoutesDeps } from '../../types';
import { riskEngineDisableRoute } from './disable';
import { riskEngineEnableRoute } from './enable';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { riskEngineInitRoute } from './init';
import { riskEnginePrivilegesRoute } from './privileges';
import { riskEngineSettingsRoute } from './settings';
import { riskEngineStatusRoute } from './status';

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
