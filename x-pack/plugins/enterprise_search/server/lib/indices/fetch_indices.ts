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

import { ElasticsearchIndexWithPrivileges } from '../../../common/types';

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

export const fetchIndexCounts = async (client: IScopedClusterClient, indicesNames: string[]) => {
  // TODO: is there way to batch this? Passing multiple index names or a pattern still returns a singular count
  const countPromises = indicesNames.map(async (indexName) => {
    const { count } = await client.asCurrentUser.count({ index: indexName });
    return { [indexName]: count };
  });
  const indexCountArray = await Promise.all(countPromises);
  return indexCountArray.reduce((acc, current) => ({ ...acc, ...current }), {});
};

export const fetchIndices = async (
  client: IScopedClusterClient,
  indexPattern: string,
  returnHiddenIndices: boolean,
  includeAliases: boolean
): Promise<ElasticsearchIndexWithPrivileges[]> => {
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

  const indexAndAliasNames = Object.keys(totalIndices).reduce((accum, indexName) => {
    accum.push(indexName);

    if (includeAliases) {
      const aliases = Object.keys(totalIndices[indexName].aliases!);
      aliases.forEach((alias) => accum.push(alias));
    }
    return accum;
  }, [] as string[]);

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

  // TODO: make multiple batched requests if indicesNames.length > SOMETHING
  const { index: indexPrivileges } = await client.asCurrentUser.security.hasPrivileges({
    index: [
      {
        names: indexAndAliasNames,
        privileges: ['read', 'manage'],
      },
    ],
  });

  const indexCounts = await fetchIndexCounts(client, indexAndAliasNames);

  return indicesNames
    .map((indexName: string) => {
      const indexData = totalIndices[indexName];
      const indexStats = indicesStats[indexName];
      return mapIndexStats(indexData, indexStats, indexName);
    })
    .flatMap(({ name, aliases, ...indexData }) => {
      // expand aliases and add to results
      const indicesAndAliases = [] as ElasticsearchIndexWithPrivileges[];
      indicesAndAliases.push({
        name,
        count: indexCounts[name] ?? 0,
        alias: false,
        privileges: { read: false, manage: false, ...indexPrivileges[name] },
        ...indexData,
      });

      if (includeAliases) {
        aliases.forEach((alias) => {
          indicesAndAliases.push({
            name: alias,
            count: indexCounts[alias] ?? 0,
            alias: true,
            privileges: { read: false, manage: false, ...indexPrivileges[name] },
            ...indexData,
          });
        });
      }
      return indicesAndAliases;
    })
    .filter(
      ({ name }, index, array) =>
        // make list of aliases unique since we add an alias per index above
        // and aliases can point to multiple indices
        array.findIndex((engineData) => engineData.name === name) === index
    );
};
