/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { sumBy, values } from 'lodash';
import { RouteRegisterParameters } from '..';
import { getRoutePaths } from '../../../common';
import { StorageExplorerSummary } from '../../../common/storage_explorer';
import { getClient } from '../compat';
import { getDailyDataGenerationSize } from './get_daily_data_generation.size';
import { getHostBreakdownSizeTimeseries } from './get_host_breakdown_size_timeseries';
import { getHostDetails } from './get_host_details';
import { getHostAndDistinctProbabilisticCount } from './get_host_distinct_probabilistic_count';
import { getIndicesDataBreakdownChart } from './get_indices_data_breakdown_chart';
import { getNodesStats, getTotalIndicesStats, getTotalSymbolsStats } from './get_indices_stats';

export function registerStorageExplorerRoute({
  logger,
  router,
  services: { createProfilingEsClient },
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  router.get(
    {
      path: paths.StorageExplorerSummary,
      options: { tags: ['access:profiling'] },
      validate: {
        query: schema.object({
          timeFrom: schema.number(),
          timeTo: schema.number(),
          kuery: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { timeFrom, timeTo, kuery } = request.query;
      const client = await getClient(context);
      const profilingClient = createProfilingEsClient({ request, esClient: client });
      const profilingEsClient = profilingClient.getEsClient();

      const [
        totalIndicesStats,
        totalSymbolsIndicesStats,
        nodeStats,
        hostAndDistinctProbabilisticCount,
      ] = await Promise.all([
        getTotalIndicesStats({
          client: profilingEsClient,
        }),
        getTotalSymbolsStats({
          client: profilingEsClient,
        }),
        getNodesStats({ client: profilingEsClient }),
        getHostAndDistinctProbabilisticCount({
          client: profilingClient,
          timeFrom,
          timeTo,
          kuery,
        }),
      ]);

      const { dailyDataGenerationBytes } = await getDailyDataGenerationSize({
        client: profilingClient,
        timeFrom,
        timeTo,
        allIndicesStats: totalIndicesStats.indices,
        kuery,
      });

      const { nodes: diskSpacePerNode } = nodeStats;
      const { totalNumberOfDistinctProbabilisticValues, totalNumberOfHosts } =
        hostAndDistinctProbabilisticCount;
      const totalProfilingSizeBytes = totalIndicesStats._all.total?.store?.size_in_bytes ?? 0;
      const totalSymbolsSizeBytes = totalSymbolsIndicesStats._all.total?.store?.size_in_bytes ?? 0;

      const totalDiskSpace = sumBy(
        values(diskSpacePerNode),
        (node) => node?.fs?.total?.total_in_bytes ?? 0
      );

      const summary: StorageExplorerSummary = {
        totalProfilingSizeBytes,
        totalSymbolsSizeBytes,
        diskSpaceUsedPct: totalProfilingSizeBytes / totalDiskSpace,
        totalNumberOfDistinctProbabilisticValues,
        totalNumberOfHosts,
        dailyDataGenerationBytes,
      };

      return response.ok({
        body: summary,
      });
    }
  );

  router.get(
    {
      path: paths.StorageExplorerHostBreakdownSizeChart,
      options: { tags: ['access:profiling'] },
      validate: {
        query: schema.object({
          timeFrom: schema.number(),
          timeTo: schema.number(),
          kuery: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = await getClient(context);
      const profilingClient = createProfilingEsClient({ request, esClient: client });

      const { timeFrom, timeTo, kuery } = request.query;
      const hostBreakdownTimeseries = await getHostBreakdownSizeTimeseries({
        client: profilingClient,
        timeFrom,
        timeTo,
        kuery,
      });
      return response.ok({ body: hostBreakdownTimeseries });
    }
  );

  router.get(
    {
      path: paths.StorageExplorerHostDetails,
      options: { tags: ['access:profiling'] },
      validate: {
        query: schema.object({
          timeFrom: schema.number(),
          timeTo: schema.number(),
          kuery: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = await getClient(context);
      const profilingClient = createProfilingEsClient({ request, esClient: client });

      const { timeFrom, timeTo, kuery } = request.query;
      const hostDetails = await getHostDetails({
        client: profilingClient,
        timeFrom,
        timeTo,
        kuery,
      });
      return response.ok({ body: hostDetails });
    }
  );

  router.get(
    {
      path: paths.StorageExplorerIndicesDataBreakdownChart,
      options: { tags: ['access:profiling'] },
      validate: false,
    },
    async (context, request, response) => {
      const client = await getClient(context);
      const profilingClient = createProfilingEsClient({ request, esClient: client });
      const profilingEsClient = profilingClient.getEsClient();

      const mainIndicesStats = await getIndicesDataBreakdownChart({ client: profilingEsClient });

      return response.ok({ body: mainIndicesStats });
    }
  );
  router.get(
    {
      path: paths.StorageExplorerIndicesDataDetails,
      options: { tags: ['access:profiling'] },
      validate: false,
    },
    async (context, request, response) => {
      const client = await getClient(context);
      const profilingClient = createProfilingEsClient({ request, esClient: client });
      const profilingEsClient = profilingClient.getEsClient();

      // const mainIndicesStats = await getDataBreakdownSize({ client: profilingEsClient });

      return response.ok({ body: [] });
    }
  );
}
