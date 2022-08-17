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
  includeAliases: boolean,
  alwaysShowSearchPattern?: 'search-'
): Promise<ElasticsearchIndexWithPrivileges[]> => {
  // This call retrieves alias and settings information about indices
  // If we provide an override pattern with alwaysShowSearchPattern we get everything and filter out hiddens.
  const expandWildcards: ExpandWildcard[] =
    returnHiddenIndices || alwaysShowSearchPattern ? ['hidden', 'all'] : ['open'];
  const totalIndices = await client.asCurrentUser.indices.get({
    expand_wildcards: expandWildcards,
    // for better performance only compute aliases and settings of indices but not mappings
    features: ['aliases', 'settings'],
    // only get specified index properties from ES to keep the response under 536MB
    // node.js string length limit: https://github.com/nodejs/node/issues/33960
    filter_path: ['*.aliases', '*.settings.index.hidden'],
    index: indexPattern,
  });

  // Index names that with one of their aliases match with the alwaysShowSearchPattern
  const alwaysShowPatternMatches = new Set<string>();

  const indexAndAliasNames = Object.keys(totalIndices).reduce((accum, indexName) => {
    accum.push(indexName);

    if (includeAliases) {
      const aliases = Object.keys(totalIndices[indexName].aliases!);
      aliases.forEach((alias) => {
        accum.push(alias);

        // Add indexName to the set if an alias matches the pattern
        if (alwaysShowSearchPattern && alias.startsWith(alwaysShowSearchPattern)) {
          alwaysShowPatternMatches.add(indexName);
        }
      });
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

  // Index data to show even if they are hidden, set by alwaysShowSearchPattern
  const alwaysShowIndices = alwaysShowSearchPattern
    ? Array.from(alwaysShowPatternMatches)
        .map((indexName: string) => {
          const indexData = totalIndices[indexName];
          const indexStats = indicesStats[indexName];
          return mapIndexStats(indexData, indexStats, indexName);
        })
        .flatMap(({ name, aliases, ...indexData }) => {
          const indicesAndAliases = [] as ElasticsearchIndexWithPrivileges[];

          if (includeAliases) {
            aliases.forEach((alias) => {
              if (alias.startsWith(alwaysShowSearchPattern)) {
                indicesAndAliases.push({
                  alias: true,
                  count: indexCounts[alias] ?? 0,
                  name: alias,
                  privileges: { manage: false, read: false, ...indexPrivileges[name] },
                  ...indexData,
                });
              }
            });
          }

          return indicesAndAliases;
        })
    : [];

  const regularIndexData = indicesNames
    .map((indexName: string) => {
      const indexData = totalIndices[indexName];
      const indexStats = indicesStats[indexName];
      return mapIndexStats(indexData, indexStats, indexName);
    })
    .flatMap(({ name, aliases, ...indexData }) => {
      // expand aliases and add to results
      const indicesAndAliases = [] as ElasticsearchIndexWithPrivileges[];
      indicesAndAliases.push({
        alias: false,
        count: indexCounts[name] ?? 0,
        name,
        privileges: { manage: false, read: false, ...indexPrivileges[name] },
        ...indexData,
      });

      if (includeAliases) {
        aliases.forEach((alias) => {
          indicesAndAliases.push({
            alias: true,
            count: indexCounts[alias] ?? 0,
            name: alias,
            privileges: { manage: false, read: false, ...indexPrivileges[name] },
            ...indexData,
          });
        });
      }
      return indicesAndAliases;
    });

  const indexNamesAlreadyIncluded = regularIndexData.map(({ name }) => name);
  const indexNamesToInclude = alwaysShowIndices
    .map(({ name }) => name)
    .filter((name) => !indexNamesAlreadyIncluded.includes(name));

  const itemsToInclude = alwaysShowIndices.filter(({ name }) => indexNamesToInclude.includes(name));

  const indicesData = alwaysShowSearchPattern
    ? ([...regularIndexData, ...itemsToInclude] as ElasticsearchIndexWithPrivileges[])
    : regularIndexData;

  return indicesData.filter(
    ({ name }, index, array) =>
      // make list of aliases unique since we add an alias per index above
      // and aliases can point to multiple indices
      array.findIndex((engineData) => engineData.name === name) === index
  );
};
