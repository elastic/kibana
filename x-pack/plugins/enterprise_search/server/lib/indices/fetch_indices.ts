/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpandWildcard } from '@elastic/elasticsearch/lib/api/types';
import {
  IndicesGetResponse,
  SecurityHasPrivilegesPrivileges,
  IndicesStatsIndicesStats,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from '@kbn/core/server';

import { AlwaysShowPattern, ElasticsearchIndexWithPrivileges } from '../../../common/types/indices';

import { fetchIndexCounts } from './fetch_index_counts';
import { fetchIndexPrivileges } from './fetch_index_privileges';
import { fetchIndexStats } from './fetch_index_stats';
import { expandAliases, getAlwaysShowAliases } from './utils/extract_always_show_indices';
import { getIndexDataMapper } from './utils/get_index_data';
import { getIndexData } from './utils/get_index_data';

export interface TotalIndexData {
  allIndexMatches: IndicesGetResponse;
  indexCounts: Record<string, number>;
  indexPrivileges: Record<string, SecurityHasPrivilegesPrivileges>;
  indicesStats: Record<string, IndicesStatsIndicesStats>;
}

export const fetchIndices = async (
  client: IScopedClusterClient,
  indexPattern: string,
  returnHiddenIndices: boolean,
  includeAliases: boolean,
  alwaysShowPattern?: AlwaysShowPattern
): Promise<ElasticsearchIndexWithPrivileges[]> => {
  // This call retrieves alias and settings information about indices
  // If we provide an override pattern with alwaysShowPattern we get everything and filter out hiddens.
  const expandWildcards: ExpandWildcard[] =
    returnHiddenIndices || alwaysShowPattern?.alias_pattern || alwaysShowPattern?.index_pattern
      ? ['hidden', 'all']
      : ['open'];

  const { allIndexMatches, indexAndAliasNames, indicesNames, alwaysShowMatchNames } =
    await getIndexData(
      client,
      indexPattern,
      expandWildcards,
      returnHiddenIndices,
      includeAliases,
      alwaysShowPattern
    );

  if (indicesNames.length === 0) {
    return [];
  }

  const indicesStats = await fetchIndexStats(client, indexPattern, expandWildcards);

  const indexPrivileges = await fetchIndexPrivileges(client, indexAndAliasNames);

  const indexCounts = await fetchIndexCounts(client, indexAndAliasNames);
  const totalIndexData: TotalIndexData = {
    allIndexMatches,
    indexCounts,
    indexPrivileges,
    indicesStats,
  };

  const regularIndexData = indicesNames
    .map(getIndexDataMapper(totalIndexData))
    .flatMap(({ name, aliases, ...indexData }) => {
      // expand aliases and add to results

      const indexEntry = {
        ...indexData,
        alias: false,
        count: indexCounts[name] ?? 0,
        name,
        privileges: { manage: false, read: false, ...indexPrivileges[name] },
      };
      return includeAliases
        ? [
            indexEntry,
            ...expandAliases(
              name,
              aliases,
              indexData,
              totalIndexData,
              ...(name.startsWith('.ent-search-engine-documents') ? [alwaysShowPattern] : [])
            ),
          ]
        : [indexEntry];
    });

  let indicesData = regularIndexData;

  if (alwaysShowPattern?.alias_pattern && includeAliases) {
    const indexNamesAlreadyIncluded = regularIndexData.map(({ name }) => name);

    const itemsToInclude = getAlwaysShowAliases(indexNamesAlreadyIncluded, alwaysShowMatchNames)
      .map(getIndexDataMapper(totalIndexData))
      .flatMap(({ name, aliases, ...indexData }) => {
        return expandAliases(name, aliases, indexData, totalIndexData, alwaysShowPattern);
      });

    indicesData = [...indicesData, ...itemsToInclude];
  }

  return indicesData.filter(
    ({ name }, index, array) =>
      // make list of aliases unique since we add an alias per index above
      // and aliases can point to multiple indices
      array.findIndex((engineData) => engineData.name === name) === index
  );
};
