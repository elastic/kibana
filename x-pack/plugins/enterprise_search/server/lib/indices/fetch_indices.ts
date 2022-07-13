/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexState, IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
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
  indexRegExp: RegExp
): Promise<ElasticsearchIndex[]> => {
  // This call retrieves alias and settings information about indices
  const indices = await client.asCurrentUser.indices.get({
    expand_wildcards: ['open'],
    // for better performance only compute aliases and settings of indices but not mappings
    features: ['aliases', 'settings'],
    // only get specified index properties from ES to keep the response under 536MB
    // node.js string length limit: https://github.com/nodejs/node/issues/33960
    filter_path: ['*.aliases'],
    index: indexPattern,
  });

  if (!Object.keys(indices).length) {
    return [];
  }

  const { indices: indicesStats = {} } = await client.asCurrentUser.indices.stats({
    expand_wildcards: ['open'],
    index: indexPattern,
    metric: ['docs', 'store'],
  });
  const indicesNames = Object.keys(indices);
  return indicesNames
    .map((indexName: string) => {
      const indexData = indices[indexName];
      const indexStats = indicesStats[indexName];
      return mapIndexStats(indexData, indexStats, indexName);
    })
    .flatMap(({ name, aliases, ...engineData }) => {
      const indicesAndAliases = [];
      indicesAndAliases.push({ name, alias: false, ...engineData });
      aliases.forEach((alias) => {
        indicesAndAliases.push({ name: alias, alias: true, ...engineData });
      });
      return indicesAndAliases;
    })
    .filter(({ name }, index, array) => {
      return (
        name.match(indexRegExp) &&
        array.findIndex((engineData) => engineData.name === name) === index
      );
    });
};
