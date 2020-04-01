/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { OpsMetrics } from 'kibana/server';
import { getKibanaUsageCollector } from './get_kibana_usage_collector';
import { getOpsStatsCollector } from './get_ops_stats_collector';
import { getSettingsCollector } from './get_settings_collector';
import { MonitoringConfig } from '../../config';

export function registerCollectors(
  usageCollection: any,
  config: MonitoringConfig,
  opsMetrics$: Observable<OpsMetrics>,
  kibanaIndex: string
) {
  usageCollection.registerCollector(getOpsStatsCollector(usageCollection, opsMetrics$));
  usageCollection.registerCollector(getKibanaUsageCollector(usageCollection, kibanaIndex));
  usageCollection.registerCollector(getSettingsCollector(usageCollection, config));
}
