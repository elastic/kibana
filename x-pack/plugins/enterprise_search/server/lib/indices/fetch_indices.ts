/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExpandWildcard,
  IndicesIndexState,
  IndicesStatsIndicesStats,
} from '@elastic/elasticsearch/lib/api/types';
import { ByteSizeValue } from '@kbn/config-schema';
import { IScopedClusterClient } from '@kbn/core/server';

import { ElasticsearchIndex } from '../../../common/types';

export const mapIndexStats = (
  indexData: IndicesIndexState,
  indexStats: IndicesStatsIndicesStats,
  indexName: string
) => {
  const aliases = Object.keys(indexData.aliases!);
  const sizeInBytes = new ByteSizeValue(indexStats?.total?.store?.size_in_bytes ?? 0).toString();

  const docCount = indexStats?.total?.docs?.count ?? 0;
  const docDeleted = indexStats?.total?.docs?.deleted ?? 0;
  const total = {
    docs: {
      count: docCount,
      deleted: docDeleted,
    },
    store: {
      size_in_bytes: sizeInBytes,
    },
  };
  return {
    aliases,
    health: indexStats?.health,
    name: indexName,
    status: indexStats?.status,
    total,
    uuid: indexStats?.uuid,
  };
};

export const fetchIndices = async (
  client: IScopedClusterClient,
  indexPattern: string,
  returnHiddenIndices: boolean,
  indexRegExp?: RegExp
): Promise<ElasticsearchIndex[]> => {
  // This call retrieves alias and settings information about indices
  const expandWildcards: ExpandWildcard[] = returnHiddenIndices ? ['hidden', 'all'] : ['open'];
  const totalIndices = await client.asCurrentUser.indices.get({
    expand_wildcards: expandWildcards,
    // for better performance only compute aliases and settings of indices but not mappings
    features: ['aliases', 'settings'],
    // only get specified index properties from ES to keep the response under 536MB
    // node.js string length limit: https://github.com/nodejs/node/issues/33960
    filter_path: ['*.aliases', '*.settings.index.hidden'],
    index: indexPattern,
  });

  const indicesNames = returnHiddenIndices
    ? Object.keys(totalIndices)
    : Object.keys(totalIndices).filter(
        (indexName) => !(totalIndices[indexName]?.settings?.index?.hidden === 'true')
      );
  if (indicesNames.length === 0) {
    return [];
  }

  const { indices: indicesStats = {} } = await client.asCurrentUser.indices.stats({
    expand_wildcards: expandWildcards,
    index: indexPattern,
    metric: ['docs', 'store'],
  });
  const resultIndices = indicesNames
    .map((indexName: string) => {
      const indexData = totalIndices[indexName];
      const indexStats = indicesStats[indexName];
      return mapIndexStats(indexData, indexStats, indexName);
    })
    .flatMap(({ name, aliases, ...engineData }) => {
      // expand aliases and add to results
      const engines = [];
      engines.push({ name, ...engineData });

      aliases.forEach((alias) => {
        engines.push({ name: alias, ...engineData });
      });
      return engines;
    });

  // The previous step could have added indices that don't match the index pattern, so filter those out again
  // We wildcard RegExp the pattern unless user provides a more specific regex
  return indexRegExp ? resultIndices.filter(({ name }) => name.match(indexRegExp)) : resultIndices;
};
