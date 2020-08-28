/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { OpsMetrics } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getSettingsCollector } from './get_settings_collector';
import { getStatsCollector } from './get_stats_collector';
import { MonitoringConfig } from '../../config';

export function registerCollectors(
  usageCollection: UsageCollectionSetup,
  config: MonitoringConfig,
  getMetrics$: () => Promise<Observable<OpsMetrics>>
) {
  usageCollection.registerCollector(getSettingsCollector(usageCollection, config));
  usageCollection.registerCollector(getStatsCollector(usageCollection, getMetrics$));
}
