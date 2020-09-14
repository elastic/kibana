/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getSettingsCollector } from './get_settings_collector';
import { getMonitoringUsageCollector } from './get_usage_collector';
import { MonitoringConfig } from '../../config';

export function registerCollectors(
  usageCollection: UsageCollectionSetup,
  config: MonitoringConfig,
  callCluster: CallCluster
) {
  usageCollection.registerCollector(getSettingsCollector(usageCollection, config));
  usageCollection.registerCollector(
    getMonitoringUsageCollector(usageCollection, config, callCluster)
  );
}
