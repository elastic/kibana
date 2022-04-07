/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteOptions } from '..';
import { monitoringRuleAggregateRoute } from './rule_aggregate';

export function defineMonitoringRoutes(opts: RouteOptions) {
  const { router, licenseState, monitoringCollection } = opts;

  monitoringRuleAggregateRoute(router, licenseState, monitoringCollection);
}
