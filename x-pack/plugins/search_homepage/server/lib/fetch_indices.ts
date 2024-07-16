/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { GetIndicesResponse } from '../../common/types';

interface FetchIndicesOptions {
  client: ElasticsearchClient;
  hasIndexStats: boolean;
  logger: Logger;
}

export async function fetchIndices(
  searchQuery: string | undefined,
  size: number,
  { client, hasIndexStats, logger }: FetchIndicesOptions
): Promise<GetIndicesResponse> {
  const indexPattern = searchQuery ? `*${searchQuery}*` : '*';
  const allIndexMatches = await client.indices.get({
    expand_wildcards: ['open'],
    // for better performance only compute aliases and settings of indices but not mappings
    features: ['aliases', 'settings'],
    // only get specified index properties from ES to keep the response under 536MB
    // node.js string length limit: https://github.com/nodejs/node/issues/33960
    filter_path: ['*.aliases', '*.settings.index.hidden', '*.settings.index.verified_before_close'],
    index: indexPattern,
  });

  let baseIndicesData = Object.entries(allIndexMatches)
    .filter(([_, indexState]) => !isHidden(indexState) && !isClosed(indexState))
    .map(([indexName, indexState]) => ({
      name: indexName,
      aliases: getAliasNames(indexState),
    }));
  if (baseIndicesData.length === 0) return { indices: [] };
  baseIndicesData = baseIndicesData.slice(0, size);

  const [indexCounts, indexStats] = await Promise.all([
    fetchIndexCounts(client, logger, baseIndicesData),
    hasIndexStats ? fetchIndexStats(client, logger, baseIndicesData) : Promise.resolve({}),
  ]);
  const indices = baseIndicesData.map(({ name, aliases }) => ({
    ...(hasIndexStats
      ? {
          health: indexStats?.[name]?.health,
          status: indexStats?.[name]?.status,
        }
      : {}),
    aliases,
    count: indexCounts[name] ?? 0,
    name,
  }));

  return { indices };
}

async function fetchIndexCounts(
  client: ElasticsearchClient,
  logger: Logger,
  indices: Array<{ name: string }>
) {
  const countPromises = indices.map(async ({ name }) => {
    try {
      const { count } = await client.count({ index: name });
      return { name, count };
    } catch {
      logger.warn(`Failed to get _count for index "${name}"`);
      // we don't want to error out the whole API call if one index breaks (eg: doesn't exist or is closed)
      return { name, count: 0 };
    }
  });

  const indexCounts = await Promise.all(countPromises);
  return indexCounts.reduce((acc, current) => {
    acc[current.name] = current.count;
    return acc;
  }, {} as Record<string, number | undefined>);
}
async function fetchIndexStats(
  client: ElasticsearchClient,
  _logger: Logger,
  indices: Array<{ name: string }>
) {
  const indexNames = indices.map(({ name }) => name);
  const { indices: indicesStats = {} } = await client.indices.stats({
    index: indexNames,
    metric: ['docs', 'store'],
  });

  return indicesStats;
}

function isHidden(index: IndicesIndexState): boolean {
  return index.settings?.index?.hidden === true || index.settings?.index?.hidden === 'true';
}
function isClosed(index: IndicesIndexState): boolean {
  return (
    index.settings?.index?.verified_before_close === true ||
    index.settings?.index?.verified_before_close === 'true'
  );
}

function getAliasNames(index: IndicesIndexState): string[] {
  if (!index.aliases) return [];
  return Object.entries(index.aliases)
    .filter(([_, alias]) => !alias.is_hidden)
    .map(([name, _]) => name);
}
