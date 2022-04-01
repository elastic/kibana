/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getTotalIndexDiskUsage } from './get_total_index_disk_usage';
import { getSearchAggregatedTransactions } from '../../lib/helpers/transactions';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getServiceStorageStats } from './get_service_storage_stats';
import { environmentRt, rangeRt } from '../default_api_types';
import { StorageExplorerItem } from '../../../common/storage_explorer_types';
import {
  getTotalDocs,
  mergeServiceStats,
} from './get_estimated_service_disk_usage';

const storageExplorerRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/storage_explorer',
  options: { tags: ['access:apm'] },
  params: t.type({
    query: t.intersection([environmentRt, rangeRt]),
  }),
  handler: async (
    resources
  ): Promise<{
    totalIndexDiskUsage: number;
    serviceStats: StorageExplorerItem[];
  }> => {
    const setup = await setupRequest(resources);
    const { params, context } = resources;
    const {
      query: { environment, start, end },
    } = params;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      kuery: '',
    });

    const [serviceStats, totalDocs, totalIndexDiskUsage] = await Promise.all([
      getServiceStorageStats({
        searchAggregatedTransactions,
        setup,
        start,
        end,
        environment,
      }),
      getTotalDocs({
        context,
        setup,
      }),
      getTotalIndexDiskUsage({ context, setup }),
    ]);

    const mergedServiceStats = mergeServiceStats({
      serviceStats,
      totalDocs,
      totalIndexDiskUsage,
    });

    return {
      totalIndexDiskUsage,
      serviceStats: mergedServiceStats,
    };
  },
});

export const storageExplorerRouteRepository = {
  ...storageExplorerRoute,
};
