/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { get } from 'lodash';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../common/constants';
import { MonitoringConfig } from '../../config';
import { fetchAvailableCcs } from '../../lib/alerts/fetch_available_ccs';
import { getCcsIndexPattern } from '../../lib/alerts/get_ccs_index_pattern';
import { getStackProductsUsage } from './lib/get_stack_products_usage';
import { StackProductUsage } from './types';

export interface MonitoringUsage {
  is_enabled: boolean;
  license: string;
  stack_product_usage: StackProductUsage[];
}

async function fetchLicenseType(callCluster: any, availableCcs: string[]) {
  let index = INDEX_PATTERN_ELASTICSEARCH;
  if (availableCcs) {
    index = getCcsIndexPattern(index, availableCcs);
  }
  const params = {
    index,
    filterPath: ['hits.hits._source.license'],
    body: {
      size: 1,
      sort: [
        {
          timestamp: {
            order: 'desc',
          },
        },
      ],

      query: {
        term: {
          type: {
            value: 'cluster_stats',
          },
        },
      },
    },
  };
  const response = await callCluster('search', params);
  return get(response, 'hits.hits[0]._source.license.type', null);
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
      return {
        is_enabled: config.ui.enabled,
        license,
        stack_product_usage: stackProductUsage,
      };
    },
  });
}
