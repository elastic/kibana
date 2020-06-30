/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Service, AlertingSetup, IRouter } from '../../types';
import { timeSeriesQuery } from './lib/time_series_query';
import { getAlertType } from './alert_type';
import { registerRoutes } from './routes';

// future enhancement: make these configurable?
export const MAX_INTERVALS = 1000;
export const MAX_GROUPS = 1000;
export const DEFAULT_GROUPS = 100;

export function getService() {
  return {
    timeSeriesQuery,
  };
}

interface RegisterParams {
  service: Service;
  router: IRouter;
  alerts: AlertingSetup;
  baseRoute: string;
}

export function register(params: RegisterParams) {
  const { service, router, alerts, baseRoute } = params;

  alerts.registerType(getAlertType(service));

  const baseBuiltInRoute = `${baseRoute}/index_threshold`;
  registerRoutes({ service, router, baseRoute: baseBuiltInRoute });
}
