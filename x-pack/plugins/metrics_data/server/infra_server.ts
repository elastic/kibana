/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsDataBackendLibs } from './lib/metrics_data_types';
import { initMetricsSourceConfigurationRoutes } from './routes/sources';

export const initInfraServer = (libs: MetricsDataBackendLibs) => {
  initMetricsSourceConfigurationRoutes(libs);
};
