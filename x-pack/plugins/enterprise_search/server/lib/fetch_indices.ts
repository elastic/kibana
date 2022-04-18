/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { IScopedClusterClient } from '@kbn/core/server';

import { ElasticsearchIndex } from '../../common/types';

export const fetchIndices = async (client: IScopedClusterClient): Promise<ElasticsearchIndex[]> => {
  const indexNamesString = 'search-*';
  const indexNamesRegEx = /^search-*/;

  // This call retrieves alias and settings information about indices
  const indices = await client.asCurrentUser.indices.get({
    index: indexNamesString,
    expand_wildcards: ['open'],
    // only get specified index properties from ES to keep the response under 536MB
    // node.js string length limit: https://github.com/nodejs/node/issues/33960
    filter_path: ['*.aliases'],
    // for better performance only compute aliases and settings of indices but not mappings
    features: ['aliases', 'settings'],
  });

  if (!Object.keys(indices).length) {
    return [];
  }

  const { indices: indicesStats = {} } = await client.asCurrentUser.indices.stats({
    index: indexNamesString,
    expand_wildcards: ['open'],
    metric: ['docs', 'store'],
  });
  const indicesNames = Object.keys(indices);
  return indicesNames
    .map((indexName: string) => {
      const indexData = indices[indexName];
      const indexStats = indicesStats[indexName];
      const aliases = Object.keys(indexData.aliases!);
      const sizeInBytes = new ByteSizeValue(
        indexStats?.total?.store?.size_in_bytes ?? 0
      ).toString();

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
        health: indexStats?.health,
        status: indexStats?.status,
        name: indexName,
        uuid: indexStats?.uuid,
        total,
        aliases,
      };
    })
    .flatMap(({ name, aliases, ...engineData }) => {
      const engines = [];
      engines.push({ name, ...engineData });
      aliases.forEach((alias) => {
        engines.push({ name: alias, ...engineData });
      });
      return engines;
    })
    .filter(({ name }) => name.match(indexNamesRegEx));
};
