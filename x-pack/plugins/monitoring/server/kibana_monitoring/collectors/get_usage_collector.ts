/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { MonitoringConfig } from '../../config';
import { fetchAvailableCcs } from '../../lib/alerts/fetch_available_ccs';
import { getStackProductsUsage } from './lib/get_stack_products_usage';
import { fetchLicenseType } from './lib/fetch_license_type';
import { StackProductUsage } from './types';

export interface MonitoringUsage {
  is_enabled: boolean;
  license: string;
  stack_product_usage: StackProductUsage[];
}

export function getMonitoringUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: MonitoringConfig,
  callCluster: any
) {
  return usageCollection.makeUsageCollector<Promise<MonitoringUsage>>({
    type: 'monitoring',
    isReady: () => true,
    fetch: async () => {
      const availableCcs = config.ui.ccs.enabled ? await fetchAvailableCcs(callCluster) : [];
      const license = await fetchLicenseType(callCluster, availableCcs);
      const stackProductUsage = await getStackProductsUsage(config, callCluster);

      const usage = {
        is_enabled: config.ui.enabled,
        license,
        stack_product_usage: stackProductUsage,
      };
      return usage;
    },
  });
}
