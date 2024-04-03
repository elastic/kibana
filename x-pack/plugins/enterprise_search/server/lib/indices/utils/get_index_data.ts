/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExpandWildcard,
  IndicesGetResponse,
  IndicesIndexState,
} from '@elastic/elasticsearch/lib/api/types';

import { IScopedClusterClient } from '@kbn/core/server';

import { AlwaysShowPattern } from '../../../../common/types/indices';

import { TotalIndexData } from '../fetch_indices';

import { mapIndexStats } from './map_index_stats';

export const getSearchIndexData = async (
  client: IScopedClusterClient,
  indexPattern: string,
  expandWildcards: ExpandWildcard[],
  returnHiddenIndices: boolean,
  includeAliases: boolean,
  alwaysShowPattern?: AlwaysShowPattern
) => {
  const totalIndices = await client.asCurrentUser.indices.get({
    expand_wildcards: expandWildcards,
    // for better performance only compute aliases and settings of indices but not mappings
    features: ['aliases', 'settings'],
    // only get specified index properties from ES to keep the response under 536MB
    // node.js string length limit: https://github.com/nodejs/node/issues/33960
    filter_path: ['*.aliases', '*.settings.index.hidden'],
    index: indexPattern,
  });

  // Index names that with one of their aliases match with the alwaysShowPattern
  const alwaysShowPatternMatches = new Set<string>();

  const indexAndAliasNames: string[] = Object.keys(totalIndices).reduce(
    (accum: string[], indexName: string) => {
      accum.push(indexName);

      if (includeAliases) {
        const aliases = Object.keys(totalIndices[indexName].aliases!);
        aliases.forEach((alias) => {
          accum.push(alias);

          // Add indexName to the set if an alias matches the pattern
          if (
            alwaysShowPattern?.alias_pattern &&
            alias.startsWith(alwaysShowPattern?.alias_pattern)
          ) {
            alwaysShowPatternMatches.add(indexName);
          }
        });
      }
      return accum;
    },
    []
  );

  const indicesNames = returnHiddenIndices
    ? Object.keys(totalIndices)
    : Object.keys(totalIndices).filter(
        (indexName) =>
          !isHidden(totalIndices[indexName]) ||
          (alwaysShowPattern?.index_pattern &&
            indexName.startsWith(alwaysShowPattern.index_pattern))
      );
  return {
    allIndexMatches: totalIndices,
    alwaysShowMatchNames: Array.from(alwaysShowPatternMatches),
    expandWildcards,
    indexAndAliasNames,
    indicesNames,
  };
};

export const getIndexDataMapper = (totalIndexData: TotalIndexData) => {
  return (indexName: string) =>
    mapIndexStats(
      totalIndexData.allIndexMatches[indexName],
      totalIndexData.indicesStats[indexName],
      indexName
    );
};

function isHidden(index: IndicesIndexState): boolean {
  return index.settings?.index?.hidden === true || index.settings?.index?.hidden === 'true';
}
function isClosed(index: IndicesIndexState): boolean {
  return (
    index.settings?.index?.verified_before_close === true ||
    index.settings?.index?.verified_before_close === 'true'
  );
}

export const getIndexData = async (
  client: IScopedClusterClient,
  onlyShowSearchOptimizedIndices: boolean,
  returnHiddenIndices: boolean,
  searchQuery?: string
): Promise<{ indexData: IndicesGetResponse; indexNames: string[] }> => {
  const expandWildcards: ExpandWildcard[] = returnHiddenIndices ? ['hidden', 'all'] : ['open'];
  const indexPattern = searchQuery ? `*${searchQuery}*` : '*';
  const allIndexMatches = await client.asCurrentUser.indices.get({
    expand_wildcards: expandWildcards,
    // for better performance only compute aliases and settings of indices but not mappings
    features: ['aliases', 'settings'],
    // only get specified index properties from ES to keep the response under 536MB
    // node.js string length limit: https://github.com/nodejs/node/issues/33960
    filter_path: ['*.aliases', '*.settings.index.hidden', '*.settings.index.verified_before_close'],
    index: onlyShowSearchOptimizedIndices ? 'search-*' : indexPattern,
  });

  const allIndexNames = returnHiddenIndices
    ? Object.keys(allIndexMatches).filter(
        (indexName) => allIndexMatches[indexName] && !isClosed(allIndexMatches[indexName])
      )
    : Object.keys(allIndexMatches).filter(
        (indexName) =>
          allIndexMatches[indexName] &&
          !isHidden(allIndexMatches[indexName]) &&
          !isClosed(allIndexMatches[indexName])
      );
  const indexNames =
    onlyShowSearchOptimizedIndices && searchQuery
      ? allIndexNames.filter((indexName) => indexName.includes(searchQuery.toLowerCase()))
      : allIndexNames;

  return {
    indexData: allIndexMatches,
    indexNames,
  };
};

export const getUnattachedIndexData = async (
  client: IScopedClusterClient,
  searchQuery?: string
): Promise<{ indexData: IndicesGetResponse; indexNames: string[] }> => {
  const expandWildcards: ExpandWildcard[] = ['open'];
  const indexPattern = searchQuery ? `*${searchQuery}*` : '*';
  const allIndexMatches = await client.asCurrentUser.indices.get({
    expand_wildcards: expandWildcards,
    // for better performance only compute aliases and settings of indices but not mappings
    features: ['aliases', 'settings'],
    // only get specified index properties from ES to keep the response under 536MB
    // node.js string length limit: https://github.com/nodejs/node/issues/33960
    filter_path: ['*.aliases', '*.settings.index.hidden', '*.settings.index.verified_before_close'],
    index: indexPattern,
  });

  const allIndexNames = Object.keys(allIndexMatches).filter(
    (indexName) =>
      allIndexMatches[indexName] &&
      !isHidden(allIndexMatches[indexName]) &&
      !isClosed(allIndexMatches[indexName])
  );
  const indexNames = allIndexNames;

  return {
    indexData: allIndexMatches,
    indexNames,
  };
};
