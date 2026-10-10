/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq, values, sumBy } from 'lodash';
import type { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import type { ApmPluginRequestHandlerContext } from '../typings';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { isIndexNotFoundError } from '../../lib/helpers/is_index_not_found_error';

async function fetchPerIndexPattern<T>(
  apmEventClient: APMEventClient,
  fetch: (index: string) => Promise<Record<string, T> | undefined>
): Promise<Record<string, T>> {
  const responses = await Promise.all(
    getApmIndexPatterns(apmEventClient).map(async (index) => {
      try {
        return await fetch(index);
      } catch (error) {
        if (isIndexNotFoundError(error)) {
          return undefined;
        }
        throw error;
      }
    })
  );

  const indices: Record<string, T> = {};
  for (const response of responses) {
    if (response) {
      for (const [indexName, value] of Object.entries(response)) {
        indices[indexName] = value;
      }
    }
  }

  return indices;
}

export async function getTotalIndicesStats({
  context,
  apmEventClient,
}: {
  context: ApmPluginRequestHandlerContext;
  apmEventClient: APMEventClient;
}): Promise<{
  _all: { total: { store: { size_in_bytes: number } } };
  indices: Record<string, IndicesStatsIndicesStats>;
}> {
  const esClient = (await context.core).elasticsearch.client;
  const indices = await fetchPerIndexPattern<IndicesStatsIndicesStats>(
    apmEventClient,
    async (index) =>
      (
        await esClient.asCurrentUser.indices.stats({
          index,
          expand_wildcards: 'all',
        })
      ).indices
  );

  const totalSize = sumBy(
    values(indices),
    (indexStats) => indexStats?.total?.store?.size_in_bytes ?? 0
  );

  return {
    _all: { total: { store: { size_in_bytes: totalSize } } },
    indices,
  };
}

export function getEstimatedSizeForDocumentsInIndex({
  allIndicesStats,
  indexName,
  numberOfDocs,
}: {
  allIndicesStats: Record<string, IndicesStatsIndicesStats>;
  indexName: string;
  numberOfDocs: number;
}) {
  const indexStats = allIndicesStats[indexName];
  const indexTotalSize = indexStats?.total?.store?.size_in_bytes ?? 0;
  const indexTotalDocCount = indexStats?.total?.docs?.count;

  const estimatedSize = indexTotalDocCount
    ? (numberOfDocs / indexTotalDocCount) * indexTotalSize
    : 0;

  return estimatedSize;
}

export async function getApmDiskSpacedUsedPct(context: ApmPluginRequestHandlerContext) {
  const esClient = (await context.core).elasticsearch.client;
  const { nodes: diskSpacePerNode } = await esClient.asCurrentUser.nodes.stats({
    metric: 'fs',
    filter_path: 'nodes.*.fs.total.total_in_bytes',
  });

  const totalDiskSpace = sumBy(
    values(diskSpacePerNode),
    (node) => node?.fs?.total?.total_in_bytes ?? 0
  );

  return totalDiskSpace;
}

export async function getIndicesLifecycleStatus({
  context,
  apmEventClient,
}: {
  context: ApmPluginRequestHandlerContext;
  apmEventClient: APMEventClient;
}) {
  const esClient = (await context.core).elasticsearch.client;
  return fetchPerIndexPattern(
    apmEventClient,
    async (index) =>
      (
        await esClient.asCurrentUser.ilm.explainLifecycle({
          index,
          filter_path: 'indices.*.phase',
        })
      ).indices
  );
}

export async function getIndicesInfo({
  context,
  apmEventClient,
}: {
  context: ApmPluginRequestHandlerContext;
  apmEventClient: APMEventClient;
}) {
  const index = getApmIndicesCombined(apmEventClient);
  const esClient = (await context.core).elasticsearch.client;
  const indicesInfo = await esClient.asCurrentUser.indices.get({
    index,
    filter_path: [
      '*.settings.index.number_of_shards',
      '*.settings.index.number_of_replicas',
      '*.data_stream',
    ],
    features: ['settings'],
    expand_wildcards: 'all',
    ignore_unavailable: true,
  });

  return indicesInfo;
}

function getApmIndexPatterns(apmEventClient: APMEventClient) {
  const {
    indices: { transaction, span, metric, error },
  } = apmEventClient;

  return uniq([transaction, span, metric, error]);
}

export function getApmIndicesCombined(apmEventClient: APMEventClient) {
  return getApmIndexPatterns(apmEventClient).join();
}
