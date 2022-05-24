/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCore } from '../../../../types';
import { kibanaInstanceRoute } from './instance';
import { kibanaInstancesRoute } from './instances';
import { kibanaOverviewRoute } from './overview';

export function registerV1KibanaRoutes(server: MonitoringCore) {
  kibanaInstanceRoute(server);
  kibanaInstancesRoute(server);
  kibanaOverviewRoute(server);
}
