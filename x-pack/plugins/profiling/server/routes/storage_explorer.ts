/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { sumBy, values } from 'lodash';
import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { StorageExplorerSummary } from '../../common/storage_explorer';
import { getClient } from './compat';

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
      const { timeFrom, timeTo } = request.query;
      const client = await getClient(context);
      const profilingClient = createProfilingEsClient({ request, esClient: client });
      const symbolsIndices = ['profiling-symbols-global', 'profiling-symbols-private'];
      const indices = [
        'profiling-events-*',
        'profiling-stacktraces',
        'profiling-executables',
        'profiling-stackframes',
        'profiling-sq-executables',
        'profiling-sq-leafframes',
        'profiling-hosts',
        ...symbolsIndices,
      ];
      const totalIndicesStats = await profilingClient.getEsClient().indices.stats({
        index: indices.join(),
        expand_wildcards: 'all',
      });
      const totalSymbolsIndicesStats = await profilingClient.getEsClient().indices.stats({
        index: symbolsIndices.join(),
        expand_wildcards: 'all',
      });
      const totalProfilingSizeBytes = totalIndicesStats._all.total?.store?.size_in_bytes ?? 0;
      const totalSymbolsSizeBytes = totalSymbolsIndicesStats._all.total?.store?.size_in_bytes ?? 0;
      const { nodes: diskSpacePerNode } = await profilingClient.getEsClient().nodes.stats({
        metric: 'fs',
        filter_path: 'nodes.*.fs.total.total_in_bytes',
      });

      const totalDiskSpace = sumBy(
        values(diskSpacePerNode),
        (node) => node?.fs?.total?.total_in_bytes ?? 0
      );

      const res = await profilingClient.search('profiling_probabilistic_cardinality', {
        index: 'profiling-hosts',
        body: {
          aggs: {
            diffProbabilisticCount: {
              cardinality: {
                field: 'profiling.agent.config.probabilistic_threshold',
              },
            },
            hostCount: {
              cardinality: {
                field: 'host.id',
              },
            },
          },
        },
      });

      const totalNumberOfDistinctProbabilisticValues =
        res.aggregations?.diffProbabilisticCount.value || 0;
      const totalNumberOfHosts = res.aggregations?.hostCount.value || 0;

      const durationAsDays = (timeTo - timeFrom) / 1000 / 60 / 60 / 24;

      const summary: StorageExplorerSummary = {
        totalProfilingSizeBytes,
        totalSymbolsSizeBytes,
        diskSpaceUsedPct: totalProfilingSizeBytes / totalDiskSpace,
        totalNumberOfDistinctProbabilisticValues,
        totalNumberOfHosts,
        dailyDataGenerationBytes: totalProfilingSizeBytes / durationAsDays,
      };

      return response.ok({
        body: summary,
      });
    }
  );
}
