/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
} from '@kbn/apm-data-access-plugin/server';
import { MetricsDataPluginSetup } from '@kbn/metrics-data-access-plugin/server';

export interface ElasticsearchAccessorOptions {
  elasticsearchClient: ElasticsearchClient;
}

export interface AssetManagerPluginSetupDependencies {
  apmDataAccess: ApmDataAccessPluginSetup;
  metricsDataAccess: MetricsDataPluginSetup;
}
export interface AssetManagerPluginStartDependencies {
  apmDataAccess: ApmDataAccessPluginStart;
}
